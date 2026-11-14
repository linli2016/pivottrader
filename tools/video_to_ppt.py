#!/usr/bin/env python3
"""
video_to_ppt.py / video_to_pdf.py - Convert lecture videos into PDF slides or PowerPoint.

Automatically detects slide transitions, skips animations and temporary flickers
via debounce stabilization, can ignore speaker webcam boxes, and exports crisp
slides directly into a PDF presentation (default) or PowerPoint (.pptx).

Requirements:
    pip install opencv-python numpy
    (Optional for PPTX: pip install python-pptx)

Usage Examples:
    # Basic usage (outputs .pdf next to video):
    python tools/video_to_ppt.py lecture.mp4

    # Ignore speaker webcam on right:
    python tools/video_to_ppt.py lecture.mp4 --webcam right

    # Ignore speaker webcam in right-center:
    python tools/video_to_ppt.py lecture.mp4 --webcam right-center

    # Output PowerPoint instead of PDF:
    python tools/video_to_ppt.py lecture.mp4 --format pptx
    # or
    python tools/video_to_ppt.py lecture.mp4 -o lecture_slides.pptx

    # Output both PDF and PPTX:
    python tools/video_to_ppt.py lecture.mp4 --format both

    python3 tools/video_to_ppt.py "/mnt/T8/Trading/Trading Videos/Martin Luk/283% Gain in 1 Year - The Story of the 22-Year-Old Swing Trader.mp4" --webcam right
    python3 tools/video_to_ppt.py "/mnt/T8/Trading/Trading Videos/Martin Luk/+969% Return in 1 Year： The Pullback Strategy of a Trading Champion.mp4" --webcam right
"""

from __future__ import annotations

import os
import sys
import time
import argparse
from typing import Optional, Tuple, List, Any

# Check dependencies
try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None

try:
    from pptx import Presentation
    from pptx.util import Inches
except ImportError:
    Presentation = None


def parse_time(time_str: Optional[str]) -> Optional[float]:
    """Parse time string like '01:23:45' or '12:34' or seconds '120' to float seconds."""
    if not time_str:
        return None
    try:
        return float(time_str)
    except ValueError:
        pass

    parts = [float(p) for p in time_str.strip().split(":")]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    elif len(parts) == 2:
        return parts[0] * 60 + parts[1]
    elif len(parts) == 1:
        return parts[0]
    else:
        raise ValueError(f"Invalid time format: {time_str}")


def format_time(seconds: float) -> str:
    """Format seconds into HH:MM:SS."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def get_webcam_mask(
    height: int,
    width: int,
    position: str = "none",
    webcam_h_ratio: float = 0.35,
    webcam_w_ratio: float = 0.28,
    custom_roi: Optional[Tuple[float, float, float, float]] = None,
) -> np.ndarray:
    """
    Generate a 2D binary mask (1 = include in comparison, 0 = ignore).
    Prevents webcam movement, lecturer gestures, or subtitles from falsely triggering slide changes.
    """
    mask = np.ones((height, width), dtype=np.uint8)

    if custom_roi is not None:
        y1, x1, y2, x2 = custom_roi
        iy1, ix1 = int(y1 * height), int(x1 * width)
        iy2, ix2 = int(y2 * height), int(x2 * width)
        roi_mask = np.zeros((height, width), dtype=np.uint8)
        roi_mask[iy1:iy2, ix1:ix2] = 1
        return roi_mask

    cam_h = int(height * webcam_h_ratio)
    cam_w = int(width * webcam_w_ratio)

    pos = position.lower()
    if pos == "bottom-right":
        mask[height - cam_h :, width - cam_w :] = 0
    elif pos == "top-right":
        mask[:cam_h, width - cam_w :] = 0
    elif pos in ("right-center", "center-right"):
        y_start = max(0, int((height - cam_h) / 2))
        y_end = min(height, y_start + cam_h)
        mask[y_start:y_end, width - cam_w :] = 0
    elif pos == "right":  # Entire right column/sidebar
        mask[:, width - cam_w :] = 0
    elif pos == "bottom-left":
        mask[height - cam_h :, :cam_w] = 0
    elif pos == "top-left":
        mask[:cam_h, :cam_w] = 0
    elif pos in ("left-center", "center-left"):
        y_start = max(0, int((height - cam_h) / 2))
        y_end = min(height, y_start + cam_h)
        mask[y_start:y_end, :cam_w] = 0
    elif pos == "left":  # Entire left column/sidebar
        mask[:, :cam_w] = 0
    elif pos == "bottom":  # Useful for moving subtitles/tickers
        mask[int(height * 0.85) :, :] = 0
    elif pos != "none":
        print(f"[Warning] Unknown webcam position '{position}', ignoring.")

    return mask


def preprocess_frame(
    frame: np.ndarray,
    target_dim: Tuple[int, int] = (640, 360),
) -> np.ndarray:
    """
    Downscale, convert to grayscale, and gently blur for fast, robust comparison.
    Uses a gentle 5x5 blur to suppress video compression artifacts while keeping
    fine chart lines, numbers, candlesticks, and text sharp.
    """
    resized = cv2.resize(frame, target_dim, interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    return blurred


def compute_similarity(
    feat1: np.ndarray, feat2: np.ndarray, unmasked: Optional[np.ndarray] = None
) -> float:
    """
    Compute normalized cross-correlation similarity score in range [-1.0, 1.0].
    Evaluates only unmasked pixels to prevent zero-padding artifacts from inflating similarity.
    Values close to 1.0 mean virtually identical images.
    """
    if unmasked is not None:
        v1 = feat1[unmasked].astype(np.float32)
        v2 = feat2[unmasked].astype(np.float32)
    else:
        v1 = feat1.astype(np.float32).ravel()
        v2 = feat2.astype(np.float32).ravel()

    s1 = float(np.std(v1))
    s2 = float(np.std(v2))
    if s1 < 1e-4 or s2 < 1e-4:
        return 1.0 if np.mean(np.abs(v1 - v2)) < 3.0 else 0.0

    m1 = float(np.mean(v1))
    m2 = float(np.mean(v2))
    corr = float(np.mean((v1 - m1) * (v2 - m2)) / (s1 * s2))
    return float(np.clip(corr, -1.0, 1.0))


def compute_difference(
    feat1: np.ndarray, feat2: np.ndarray, unmasked: Optional[np.ndarray] = None
) -> Tuple[float, float]:
    """
    Compute Mean Absolute Error (MAE) and percentage of changed pixels (>25 intensity delta).
    Essential for detecting changes in charts/software demos where background and chrome are static.
    """
    if unmasked is not None:
        v1 = feat1[unmasked].astype(np.float32)
        v2 = feat2[unmasked].astype(np.float32)
    else:
        v1 = feat1.astype(np.float32).ravel()
        v2 = feat2.astype(np.float32).ravel()

    diff = np.abs(v1 - v2)
    mae = float(np.mean(diff))
    pct = float(np.count_nonzero(diff > 25) / max(1, len(diff)))
    return mae, pct


def jpegs_to_pdf(pages: List[Tuple[int, int, bytes]], output_path: str):
    """
    Assembles a list of (width, height, raw_jpeg_bytes) into a valid, standard PDF
    with zero external dependencies (no Pillow or reportlab required).
    """
    xref = [0]
    out = bytearray()

    def write(s):
        if isinstance(s, str):
            out.extend(s.encode("latin1"))
        else:
            out.extend(s)

    write("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    num_pages = len(pages)
    page_obj_ids = [3 + 3 * i for i in range(num_pages)]

    # 1 0 obj Catalog
    xref.append(len(out))
    write("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

    # 2 0 obj Pages
    xref.append(len(out))
    kids_str = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    write(f"2 0 obj\n<< /Type /Pages /Kids [{kids_str}] /Count {num_pages} >>\nendobj\n")

    for i, (w, h, data) in enumerate(pages):
        page_id = 3 + 3 * i
        content_id = 4 + 3 * i
        img_id = 5 + 3 * i

        # Page object
        xref.append(len(out))
        write(
            f"{page_id} 0 obj\n"
            f"<< /Type /Page /Parent 2 0 R\n"
            f"   /MediaBox [0 0 {w} {h}]\n"
            f"   /Resources << /XObject << /Im1 {img_id} 0 R >> /ProcSet [/PDF /ImageC] >>\n"
            f"   /Contents {content_id} 0 R >>\nendobj\n"
        )

        # Content stream: scales image to fit MediaBox
        content = f"q {w} 0 0 {h} 0 0 cm /Im1 Do Q\n".encode("latin1")
        xref.append(len(out))
        write(f"{content_id} 0 obj\n<< /Length {len(content)} >>\nstream\n")
        write(content)
        write("endstream\nendobj\n")

        # Image XObject (embeds JPEG without re-compression)
        xref.append(len(out))
        write(
            f"{img_id} 0 obj\n"
            f"<< /Type /XObject /Subtype /Image\n"
            f"   /Width {w} /Height {h}\n"
            f"   /ColorSpace /DeviceRGB\n"
            f"   /BitsPerComponent 8\n"
            f"   /Filter /DCTDecode\n"
            f"   /Length {len(data)} >>\nstream\n"
        )
        write(data)
        write("\nendstream\nendobj\n")

    xref_offset = len(out)
    total_objs = len(xref)
    write(f"xref\n0 {total_objs}\n")
    write("0000000000 65535 f \n")
    for offset in xref[1:]:
        write(f"{offset:010d} 00000 n \n")

    write(f"trailer\n<< /Size {total_objs} /Root 1 0 R >>\n" f"startxref\n{xref_offset}\n%%EOF\n")

    with open(output_path, "wb") as f:
        f.write(out)


class PdfDeckBuilder:
    """Builds a crisp, standard PDF presentation from slide frames."""

    def __init__(self, video_width: int, video_height: int):
        self.width = video_width
        self.height = video_height
        self.pages: List[Tuple[int, int, bytes]] = []

    def add_slide(self, frame: np.ndarray, timestamp_sec: float, slide_num: int):
        # Encode frame to high quality JPEG
        success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if success:
            h, w = frame.shape[:2]
            self.pages.append((w, h, buffer.tobytes()))

    def save(self, output_path: str):
        if not self.pages:
            return
        jpegs_to_pdf(self.pages, output_path)


class PptxDeckBuilder:
    """Builds a PowerPoint presentation matching the video aspect ratio."""

    def __init__(self, video_width: int, video_height: int):
        if Presentation is None:
            raise ImportError(
                "python-pptx is not installed. Please run: pip install python-pptx"
            )

        self.prs = Presentation()
        self.prs.slide_layouts[6]  # Blank slide

        # Match slide aspect ratio to video
        aspect_ratio = video_width / max(1, video_height)
        if aspect_ratio >= 1.6:  # Standard 16:9 widescreen
            self.slide_width = Inches(13.333)
            self.slide_height = Inches(7.5)
        elif aspect_ratio >= 1.25:  # Standard 4:3
            self.slide_width = Inches(10.0)
            self.slide_height = Inches(7.5)
        else:  # Custom aspect ratio
            self.slide_width = Inches(10.0)
            self.slide_height = Inches(10.0 / aspect_ratio)

        self.prs.slide_width = self.slide_width
        self.prs.slide_height = self.slide_height
        self.temp_files: List[str] = []

    def add_slide(self, frame: np.ndarray, timestamp_sec: float, slide_num: int):
        slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        temp_img = f"._temp_slide_{slide_num}_{int(time.time()*1000)}.png"
        cv2.imwrite(temp_img, frame)
        self.temp_files.append(temp_img)

        slide.shapes.add_picture(
            temp_img,
            left=0,
            top=0,
            width=self.slide_width,
            height=self.slide_height,
        )

        try:
            notes_slide = slide.notes_slide
            tf = notes_slide.notes_text_frame
            tf.text = (
                f"Slide {slide_num}\n"
                f"Video Timestamp: {format_time(timestamp_sec)} ({timestamp_sec:.1f}s)"
            )
        except Exception:
            pass

    def save(self, output_path: str):
        self.prs.save(output_path)
        for p in self.temp_files:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass


def extract_slides(
    video_path: str,
    output_path: str,
    output_format: str = "pdf",
    sample_interval: float = 1.0,
    similarity_threshold: float = 0.92,
    min_duration: float = 1.5,
    webcam_pos: str = "none",
    webcam_size: Tuple[float, float] = (0.35, 0.28),
    custom_roi: Optional[Tuple[float, float, float, float]] = None,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
    save_images_dir: Optional[str] = None,
    max_slides: int = 500,
    min_change_pct: float = 0.04,
    min_change_mae: float = 6.0,
):
    if cv2 is None:
        print("[Error] OpenCV is required. Run: pip install opencv-python")
        sys.exit(1)

    if not os.path.isfile(video_path):
        print(f"[Error] Video file not found: {video_path}")
        sys.exit(1)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[Error] Could not open video file: {video_path}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    video_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_duration = total_frames / fps

    start_sec = max(0.0, start_time or 0.0)
    end_sec = min(total_duration, end_time or total_duration)

    # Determine output targets
    do_pdf = output_format in ("pdf", "both") or output_path.lower().endswith(".pdf")
    do_pptx = output_format in ("pptx", "both") or output_path.lower().endswith(".pptx")

    if not do_pdf and not do_pptx:
        do_pdf = True

    base_without_ext = os.path.splitext(output_path)[0]
    pdf_target = f"{base_without_ext}.pdf" if do_pdf else None
    pptx_target = f"{base_without_ext}.pptx" if do_pptx else None

    if do_pptx and Presentation is None:
        print("[Warning] python-pptx is not installed. Skipping PPTX generation.")
        print("          Run: pip install python-pptx to enable PPTX output.")
        do_pptx = False
        pptx_target = None

    print(f"==================================================")
    print(f" Lecture Video to Slide Deck Converter")
    print(f"==================================================")
    print(f" Input Video:     {os.path.abspath(video_path)}")
    print(f" Resolution:      {video_width}x{video_height} @ {fps:.2f} fps")
    print(f" Duration:        {format_time(total_duration)} ({total_duration:.1f}s)")
    print(f" Processing Span: {format_time(start_sec)} -> {format_time(end_sec)}")
    print(f" Sample Interval: {sample_interval:.1f}s")
    print(f" Sensitivity:     Threshold={similarity_threshold}, MinStable={min_duration}s, MinChange={min_change_pct*100:.1f}%")
    if webcam_pos != "none":
        print(f" Webcam Mask:     {webcam_pos} (ignored in comparison)")
    if save_images_dir:
        os.makedirs(save_images_dir, exist_ok=True)
        print(f" Image Export:    {os.path.abspath(save_images_dir)}")
    if pdf_target:
        print(f" Output PDF:      {os.path.abspath(pdf_target)}")
    if pptx_target:
        print(f" Output PPTX:     {os.path.abspath(pptx_target)}")
    print(f"==================================================")

    # Initialize mask & builders
    cam_h_r, cam_w_r = webcam_size
    mask = get_webcam_mask(
        height=360,
        width=640,
        position=webcam_pos,
        webcam_h_ratio=cam_h_r,
        webcam_w_ratio=cam_w_r,
        custom_roi=custom_roi,
    )
    unmasked = mask > 0

    pdf_builder = PdfDeckBuilder(video_width, video_height) if do_pdf else None
    pptx_builder = PptxDeckBuilder(video_width, video_height) if do_pptx else None

    # State tracking
    last_saved_feature: Optional[np.ndarray] = None
    candidate_feature: Optional[np.ndarray] = None
    candidate_frame: Optional[np.ndarray] = None
    candidate_timestamp: float = 0.0
    candidate_stable_sec: float = 0.0

    captured_slides: List[Tuple[int, float]] = []
    current_sec = start_sec

    start_clock = time.time()

    def commit_slide(frame: np.ndarray, timestamp: float) -> bool:
        nonlocal captured_slides, last_saved_feature
        slide_idx = len(captured_slides) + 1
        if slide_idx > max_slides:
            print(f"\n[Warning] Reached max slides limit ({max_slides}). Stopping.")
            return False

        if pdf_builder:
            pdf_builder.add_slide(frame, timestamp, slide_idx)
        if pptx_builder:
            pptx_builder.add_slide(frame, timestamp, slide_idx)

        if save_images_dir:
            img_dest = os.path.join(save_images_dir, f"slide_{slide_idx:03d}_{int(timestamp)}s.png")
            cv2.imwrite(img_dest, frame)

        captured_slides.append((slide_idx, timestamp))
        last_saved_feature = preprocess_frame(frame)
        sys.stdout.write(f"\r  [+] Captured Slide #{slide_idx:02d} at {format_time(timestamp)} ({timestamp:.1f}s)\n")
        sys.stdout.flush()
        return True

    def is_different_from_saved(feat: np.ndarray, saved_feat: np.ndarray) -> bool:
        sim = compute_similarity(feat, saved_feat, unmasked)
        mae, pct_diff = compute_difference(feat, saved_feat, unmasked)
        return (sim < similarity_threshold) or (pct_diff > min_change_pct) or (mae > min_change_mae)

    def is_candidate_stable(feat: np.ndarray, cand_feat: np.ndarray) -> bool:
        sim = compute_similarity(feat, cand_feat, unmasked)
        mae, pct_diff = compute_difference(feat, cand_feat, unmasked)
        return (sim >= max(0.95, similarity_threshold)) and (pct_diff < (min_change_pct * 0.75)) and (mae < 4.5)

    # Main scan loop
    while current_sec <= end_sec:
        target_frame_idx = int(current_sec * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame_idx)
        ret, frame = cap.read()
        if not ret:
            break

        current_feat = preprocess_frame(frame)

        if last_saved_feature is None:
            # First slide candidate
            if candidate_feature is None:
                candidate_feature = current_feat
                candidate_frame = frame.copy()
                candidate_timestamp = current_sec
                candidate_stable_sec = 0.0
            else:
                if is_candidate_stable(current_feat, candidate_feature):
                    candidate_stable_sec += sample_interval
                    if candidate_stable_sec >= min_duration:
                        commit_slide(candidate_frame, candidate_timestamp)
                        candidate_feature = None
                        candidate_frame = None
                else:
                    candidate_feature = current_feat
                    candidate_frame = frame.copy()
                    candidate_timestamp = current_sec
                    candidate_stable_sec = 0.0
        else:
            if is_different_from_saved(current_feat, last_saved_feature):
                # Frame differs from currently saved slide
                if candidate_feature is None:
                    candidate_feature = current_feat
                    candidate_frame = frame.copy()
                    candidate_timestamp = current_sec
                    candidate_stable_sec = 0.0
                else:
                    if is_candidate_stable(current_feat, candidate_feature):
                        candidate_stable_sec += sample_interval
                        if candidate_stable_sec >= min_duration:
                            if not commit_slide(candidate_frame, candidate_timestamp):
                                break
                            candidate_feature = None
                            candidate_frame = None
                    else:
                        # Frame still animating, panning, or transitioning
                        candidate_feature = current_feat
                        candidate_frame = frame.copy()
                        candidate_timestamp = current_sec
                        candidate_stable_sec = 0.0
            else:
                # Still viewing the same slide, reset candidate
                candidate_feature = None
                candidate_frame = None
                candidate_stable_sec = 0.0

        # Progress reporting
        processed_sec = current_sec - start_sec
        total_work_sec = max(0.1, end_sec - start_sec)
        pct = min(100.0, (processed_sec / total_work_sec) * 100.0)
        elapsed = time.time() - start_clock
        fps_proc = (processed_sec / elapsed) if elapsed > 0 else 0
        rem_sec = ((total_work_sec - processed_sec) / fps_proc) if fps_proc > 0 else 0

        # Visual progress bar (20 chars)
        bar_len = 20
        filled_len = int(bar_len * (pct / 100.0))
        bar = "=" * filled_len + (">" if filled_len < bar_len else "")
        bar_str = f"[{bar:<{bar_len}}]"

        sys.stdout.write(
            f"\r{bar_str} {pct:5.1f}% [{format_time(current_sec)}/{format_time(end_sec)}] | "
            f"Slides: {len(captured_slides)} | Speed: {fps_proc:.1f}x | ETA: {format_time(rem_sec)}"
        )
        sys.stdout.flush()

        current_sec += sample_interval

    # Save pending candidate if it was reasonably stable at the end
    if candidate_frame is not None and candidate_stable_sec >= (min_duration * 0.5):
        commit_slide(candidate_frame, candidate_timestamp)

    cap.release()
    print()  # Newline after progress bar

    # Save presentations
    if len(captured_slides) > 0:
        print(f"\n==================================================")
        print(f" [SUCCESS] Extracted {len(captured_slides)} slides!")
        if pdf_builder and pdf_target:
            pdf_builder.save(pdf_target)
            print(f" Output PDF:  {os.path.abspath(pdf_target)}")
        if pptx_builder and pptx_target:
            pptx_builder.save(pptx_target)
            print(f" Output PPTX: {os.path.abspath(pptx_target)}")
        print(f"==================================================")
    else:
        print("\n[Warning] No slides were detected. Try lowering --threshold (e.g. 0.88).")


def main():
    parser = argparse.ArgumentParser(
        description="Convert lecture videos into PDF slides (or PowerPoint) with automatic change detection."
    )
    parser.add_argument("video", help="Path to lecture video file (mp4, mkv, mov, etc.)")
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="Output path (default: <video_basename>_slides.pdf)",
    )
    parser.add_argument(
        "--format",
        choices=["pdf", "pptx", "both"],
        default="pdf",
        help="Output format: 'pdf' (default), 'pptx', or 'both'",
    )
    parser.add_argument(
        "--sample-interval",
        type=float,
        default=1.0,
        help="Seconds between frame checks (default: 1.0)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.92,
        help="Similarity threshold 0.0-1.0 (default: 0.92, lower detects smaller changes)",
    )
    parser.add_argument(
        "--min-duration",
        type=float,
        default=1.5,
        help="Minimum seconds a slide must remain stable to be captured (default: 1.5)",
    )
    parser.add_argument(
        "--webcam",
        choices=[
            "none",
            "right-center",
            "center-right",
            "right",
            "bottom-right",
            "top-right",
            "left-center",
            "center-left",
            "left",
            "bottom-left",
            "top-left",
            "bottom",
        ],
        default="none",
        help="Mask out speaker webcam to prevent false triggers (e.g. 'right' or 'right-center')",
    )
    parser.add_argument(
        "--webcam-size",
        type=str,
        default="0.35,0.28",
        help="Webcam height and width fraction as 'h_ratio,w_ratio' (default: 0.35,0.28)",
    )
    parser.add_argument(
        "--roi",
        type=str,
        default=None,
        help="Custom comparison ROI as 'ymin,xmin,ymax,xmax' in 0.0-1.0 coords (e.g. 0.0,0.0,0.85,1.0)",
    )
    parser.add_argument(
        "--start",
        type=str,
        default=None,
        help="Start timestamp (e.g. '00:02:15' or seconds '135')",
    )
    parser.add_argument(
        "--end",
        type=str,
        default=None,
        help="End timestamp (e.g. '00:45:00' or seconds '2700')",
    )
    parser.add_argument(
        "--save-images",
        type=str,
        default=None,
        help="Optional directory to also save extracted slide images as PNGs",
    )
    parser.add_argument(
        "--min-change-pct",
        type=float,
        default=0.04,
        help="Fraction of unmasked pixels that must change to trigger a new slide (default: 0.04; set 0.02-0.03 for subtle charts/code)",
    )
    parser.add_argument(
        "--chart-mode",
        action="store_true",
        help="Optimized preset for financial stock charts and screen shares: tighter line sensitivity and narrower webcam mask",
    )
    parser.add_argument(
        "--max-slides",
        type=int,
        default=500,
        help="Maximum slides to extract (safety limit, default: 500)",
    )

    args = parser.parse_args()

    # Apply chart-mode preset adjustments if enabled
    if args.chart_mode:
        if args.min_duration == 1.5:
            args.min_duration = 2.0
        if args.min_change_pct == 0.04:
            args.min_change_pct = 0.035
        if args.webcam == "right" and args.webcam_size == "0.35,0.28":
            args.webcam_size = "0.35,0.15"

    # Determine default output file (saves next to the input video as .pdf by default)
    video_dir = os.path.dirname(os.path.abspath(args.video))
    base_name = os.path.splitext(os.path.basename(args.video))[0]

    fmt = args.format.lower()
    if args.output:
        out_ext = os.path.splitext(args.output)[1].lower()
        if out_ext == ".pptx":
            fmt = "pptx"
        elif out_ext == ".pdf":
            fmt = "pdf"
    else:
        ext = ".pptx" if fmt == "pptx" else ".pdf"
        args.output = os.path.join(video_dir, f"{base_name}_slides{ext}")

    custom_roi = None
    if args.roi:
        coords = [float(x.strip()) for x in args.roi.split(",")]
        if len(coords) != 4:
            print("[Error] --roi must be 4 comma-separated floats: ymin,xmin,ymax,xmax")
            sys.exit(1)
        custom_roi = tuple(coords)

    start_sec = parse_time(args.start)
    end_sec = parse_time(args.end)

    webcam_size = (0.35, 0.28)
    if args.webcam_size:
        parts = [float(x.strip()) for x in args.webcam_size.split(",")]
        if len(parts) == 2:
            webcam_size = (parts[0], parts[1])
        else:
            print("[Warning] --webcam-size must be 'h_ratio,w_ratio'. Using default (0.35, 0.28).")

    extract_slides(
        video_path=args.video,
        output_path=args.output,
        output_format=fmt,
        sample_interval=args.sample_interval,
        similarity_threshold=args.threshold,
        min_duration=args.min_duration,
        webcam_pos=args.webcam,
        webcam_size=webcam_size,
        custom_roi=custom_roi,
        start_time=start_sec,
        end_time=end_sec,
        save_images_dir=args.save_images,
        max_slides=args.max_slides,
        min_change_pct=args.min_change_pct,
    )


if __name__ == "__main__":
    main()
