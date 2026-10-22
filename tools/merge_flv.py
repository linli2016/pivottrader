import os
import re
import shutil
import subprocess
from pathlib import Path
from collections import defaultdict

def find_and_process_videos(input_folder, output_folder):
    # Ensure output folder exists
    # os.makedirs(output_folder, exist_ok=True)
    
    # Dictionary to store video pairs (e.g., 'Video 02': ['Video 02A', 'Video 02B'])
    video_pairs = defaultdict(list)
    
    # Regular expression to match video files like "Video 02A ..." or "Video 02B ..."
    pattern = re.compile(r"^(\d{2}) .* (\d+).flv$", re.IGNORECASE)
    
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
                video_key = target_file.replace(f" {suffix}", f"")
                
                video_pairs[video_key].append(file_path)
            else:
                # If file doesn't match pattern, copy it directly
                dest_path = os.path.join(target_folder, file)
                shutil.copy2(file_path, dest_path)
                print(f"Copied: {file} to {dest_path}")
    
    # Process video pairs for merging
    # for key, values in video_pairs.items():
    #     print(key)
    #     for f in values:
    #         print(f"\t{f}")    
    for video_key, files in video_pairs.items():
        assert len(files) > 1, files
        # merge them
        merge_videos(sorted(files, key=lambda x: (len(x), x)), video_key)


def merge_videos(video_s, output_file):
    print(f"Merge to {output_file}, {video_s}")
    # return
    
    # Create a temporary file listing the videos to merge
    temp_list = "video_list.txt"
    with open(temp_list, "w") as f:
        for video in video_s:
            f.write(f"file '{video}'\n")

    # FFmpeg command to merge videos
    cmd = [
        "ffmpeg",
        "-f", "concat",
        "-safe", "0",
        "-i", temp_list,
        "-c", "copy",
        output_file
    ]
    
    try:
        # Run the FFmpeg command
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print(f"Merged: {[os.path.basename(v) for v in video_s]} into {os.path.basename(output_file)}")
    except subprocess.CalledProcessError as e:
        print(f"Error merging videos: {e.stderr}")
    finally:
        # Clean up temporary file
        if os.path.exists(temp_list):
            os.remove(temp_list)

if __name__ == "__main__":
    # Define input and output folders
    input_folder = "/mnt/T8/Al Brooks/Al Brooks Trading Course (FLV)"
    output_folder = "/mnt/T8/Al Brooks/Al Brooks Trading Course (FLV Merged)"
    
    find_and_process_videos(input_folder, output_folder)