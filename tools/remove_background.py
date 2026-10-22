import os
from PIL import Image, ImageChops

def trim_black_borders(input_folder, output_folder, threshold=10):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for filename in os.listdir(input_folder):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            img = Image.open(os.path.join(input_folder, filename)).convert("RGB")
            
            # Find the bounding box of parts of the image that are 
            # brighter than the threshold
            bg = Image.new(img.mode, img.size, (0, 0, 0))
            diff = ImageChops.difference(img, bg)
            diff = ImageChops.add(diff, diff, 2.0, -threshold)
            bbox = diff.getbbox()

            if bbox:
                cropped_img = img.crop(bbox)
                cropped_img.save(os.path.join(output_folder, f"cropped_{filename}"))
                print(f"Processed: {filename}")
            else:
                print(f"Skipped {filename}: No content found.")

# Usage
trim_black_borders('/Users/linli/Documents/Ali Moin-Afshari/Introductory Course/Printable', '/Users/linli/Documents/Ali Moin-Afshari/Introductory Course/printable_better')
