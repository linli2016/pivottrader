import os

def rename_video_files(root_folder):
    # Walk through all subdirectories recursively
    for foldername, subfolders, filenames in os.walk(root_folder):
        for filename in filenames:
            # Check if file is a video file starting with "Video " and ends with ".mp4"
            if filename.startswith("BTC ") and filename.endswith(".mp4"):
                # Construct old and new file paths
                old_file_path = os.path.join(foldername, filename)
                new_filename = filename.replace("BTC ", "", 1)  # Remove "Video " from start
                new_file_path = os.path.join(foldername, new_filename)
                
                try:
                    # Rename the file
                    os.rename(old_file_path, new_file_path)
                    print(f"Renamed: {old_file_path} -> {new_file_path}")
                except Exception as e:
                    print(f"Error renaming {old_file_path}: {str(e)}")

if __name__ == "__main__":
    # Specify the root folder path
    root_folder = "/mnt/T8/Al Brooks/Al Brooks Trading Course/4 Bonus Videos"
    
    # Verify the folder exists
    if not os.path.exists(root_folder):
        print("Error: The specified folder does not exist.")
    else:
        rename_video_files(root_folder)
        print("Renaming process completed.")