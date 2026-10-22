import os
import re
import shutil
import subprocess
from pathlib import Path
from collections import defaultdict

def find_and_process_pdfs(input_folder, output_folder, dry_run=False):
    # Dictionary to store video pairs (e.g., 'Video 02': ['Video 02A', 'Video 02B'])
    video_pairs = defaultdict(list)
        
    pattern = re.compile(r"(\d{2})([ABCDEFGHIJKLMN])\b.*\.pdf$", re.IGNORECASE)
    
    # Iterate through all subfolders
    for root, subfolders, files in os.walk(input_folder):
        target_folder = root.replace(input_folder, output_folder)
        os.makedirs(target_folder, exist_ok=True)

        for file in sorted(files):            
            file_path = os.path.join(root, file)
            target_file = os.path.join(target_folder, file)
            match = pattern.match(file)
            
            if match:
                # Extract video number (e.g., '02') and suffix (e.g., 'A' or 'B')
                video_num, suffix = match.groups()                
                video_pairs[video_num].append(file_path)
            else:
                # If file doesn't match pattern, copy it directly
                dest_path = os.path.join(target_folder, file)
                if not dry_run:
                    shutil.copy2(file_path, dest_path)
                print(f"Copied: {file} to {dest_path}")
    
    # Process video pairs for merging
    for video_key, files in video_pairs.items():
        assert len(files) > 1, files
        # merge them
        filename = os.path.basename(files[0])
        output_file = f"{output_folder}/{video_key}{filename[3:]}"
        merge_pdfs(sorted(files), output_file, dry_run)


def merge_pdfs(video_s, output_file, dry_run=False):   
    # pdftk file1.pdf file2.pdf cat output mergedfile.pdf
    # qpdf --empty --pages input1.pdf input2.pdf input3.pdf -- output.pdf
    video_s = sorted(video_s)
    cmd = [
        "qpdf", "--empty", "--pages",
        *video_s,
        "--",
        output_file
    ]
    print(cmd)

    if dry_run:
        return
    
    try:
        # Run the FFmpeg command
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print(f"Merged")
    except subprocess.CalledProcessError as e:
        raise Exception(f"Error merging pdfs: {e.stderr}")


if __name__ == "__main__":
    # Define input and output folders
    input_folder = "/mnt/T8/Al Brooks/Al Brooks Trading Course/ppts"  # Replace with your input folder path
    output_folder = "/mnt/T8/Al Brooks/Al Brooks Trading Course/PPT_merged"  # Replace with your output folder path
    
    find_and_process_pdfs(input_folder, output_folder, dry_run=False)
    