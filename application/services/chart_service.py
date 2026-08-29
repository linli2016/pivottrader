import os
import re
import zlib
import struct
import base64
import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger("pivottrader.chart_service")

def sanitize_folder_name(name: str) -> str:
    """Sanitize directory name allowing alphanumeric characters, spaces, hyphens, and underscores."""
    if not name:
        return "General"
    # Remove characters that are unsafe for directory names
    clean = re.sub(r'[^\w\s-]', '', name).strip()
    return clean or "General"

def sanitize_filename_part(part: str) -> str:
    """Sanitize filename components (symbol, date)."""
    if not part:
        return "unknown"
    # Remove path traversal and unsafe characters
    clean = re.sub(r'[^\w-]', '', part).strip()
    return clean or "unknown"

def optimize_png_bytes(png_bytes: bytes) -> bytes:
    """
    Optimizes PNG by re-compressing IDAT chunks with zlib level 9 compression.
    Leaves non-IDAT chunks intact. Fallbacks safely to original bytes on any parse issue.
    """
    if not png_bytes or not png_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
        return png_bytes

    try:
        pos = 8
        chunks = []
        idat_data = []
        file_len = len(png_bytes)

        while pos + 12 <= file_len:
            length = struct.unpack('>I', png_bytes[pos:pos+4])[0]
            chunk_type = png_bytes[pos+4:pos+8]
            chunk_data = png_bytes[pos+8:pos+8+length]
            crc = png_bytes[pos+8+length:pos+12+length]
            pos += 12 + length

            if chunk_type == b'IDAT':
                idat_data.append(chunk_data)
            else:
                chunks.append((chunk_type, chunk_data))

        if not idat_data:
            return png_bytes

        raw_idat = b''.join(idat_data)
        decompressed = zlib.decompress(raw_idat)
        recompressed = zlib.compress(decompressed, level=9)

        # If recompression didn't save space, return original
        if len(recompressed) >= len(raw_idat):
            return png_bytes

        # Reassemble optimized PNG stream
        out = [b'\x89PNG\r\n\x1a\n']
        idat_inserted = False

        for chunk_type, chunk_data in chunks:
            if chunk_type == b'IEND' and not idat_inserted:
                idat_crc = zlib.crc32(b'IDAT' + recompressed) & 0xffffffff
                out.append(struct.pack('>I', len(recompressed)))
                out.append(b'IDAT')
                out.append(recompressed)
                out.append(struct.pack('>I', idat_crc))
                idat_inserted = True

            crc = zlib.crc32(chunk_type + chunk_data) & 0xffffffff
            out.append(struct.pack('>I', len(chunk_data)))
            out.append(chunk_type)
            out.append(chunk_data)
            out.append(struct.pack('>I', crc))

        return b''.join(out)
    except Exception as e:
        logger.warning(f"Could not optimize PNG bytes, writing original data: {e}")
        return png_bytes

def save_chart_screenshot(symbol: str, setup_name: str, date_str: str, image_base64: str) -> Dict[str, Any]:
    """
    Decodes base64 PNG data, applies level 9 compression, and stores the image under:
    ./charts/{setup_name}/{symbol}_{date}.png
    """
    try:
        clean_setup = sanitize_folder_name(setup_name)
        clean_symbol = sanitize_filename_part(symbol).upper()
        clean_date = sanitize_filename_part(date_str)

        # Handle data URL prefix if present (e.g. "data:image/png;base64,...")
        if "," in image_base64:
            _, image_base64 = image_base64.split(",", 1)

        raw_bytes = base64.b64decode(image_base64)
        image_bytes = optimize_png_bytes(raw_bytes)

        charts_dir = Path("charts") / clean_setup
        charts_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{clean_symbol}_{clean_date}.png"
        file_path = charts_dir / filename

        with open(file_path, "wb") as f:
            f.write(image_bytes)

        relative_path = f"./charts/{clean_setup}/{filename}"
        logger.info(f"Successfully saved compressed chart screenshot: {relative_path} ({len(image_bytes)/1024:.1f} KB, reduced from {len(raw_bytes)/1024:.1f} KB)")

        return {
            "status": "success",
            "file_path": relative_path,
            "filename": filename,
            "setup_name": clean_setup,
            "symbol": clean_symbol,
            "date": clean_date,
            "size_bytes": len(image_bytes),
            "size_kb": round(len(image_bytes) / 1024, 1)
        }
    except Exception as e:
        logger.error(f"Failed to save chart screenshot: {e}", exc_info=True)
        raise e

