import os
import fitz  # PyMuPDF
from pathlib import Path

def convert_pdf_to_jpeg(folder_path, output_root):
    # Ensure the folder exists
    if not os.path.exists(folder_path):
        print(f"Folder {folder_path} does not exist.")
        return

    # Iterate through all files in the folder
    for file_name in sorted(os.listdir(folder_path)):
        if file_name.lower().endswith('.pdf'):
            pdf_path = os.path.join(folder_path, file_name)
            pdf_name = Path(file_name).stem  # Get the file name without extension
            
            # Create output subfolder
            output_folder = os.path.join(output_root, pdf_name)
            os.makedirs(output_folder, exist_ok=True)
            
            try:
                # Open the PDF
                pdf_document = fitz.open(pdf_path)
                
                # Iterate through each page
                for page_num in range(pdf_document.page_count):
                    page = pdf_document[page_num]
                    
                    # Convert page to image
                    pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))  # 300 DPI
                    
                    # Save as JPEG
                    output_path = os.path.join(output_folder, f"{page_num + 1:03d}.jpg")
                    pix.save(output_path, "jpg")
                    print(f"Saved {output_path}")
                
                pdf_document.close()
                
            except Exception as e:
                print(f"Error processing {file_name}: {str(e)}")

if __name__ == "__main__":
    # Specify the folder containing PDFs
    folder_path = "/mnt/T8/Al Brooks/Al Brooks Trading Course/ppts"
    output_path = "/mnt/T8/Al Brooks/Al Brooks Trading Course/ppt_images"
    convert_pdf_to_jpeg(folder_path, output_path)
