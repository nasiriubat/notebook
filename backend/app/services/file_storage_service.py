from werkzeug.utils import secure_filename
import os

UPLOAD_FOLDER = 'uploads'	

class FileStorageService:
    @staticmethod
    def save_file(file, file_name):
        file_path = os.path.join(UPLOAD_FOLDER, secure_filename(file_name))
        file.save(file_path)
        return file_path

    @staticmethod
    def delete_file(file_path):
        if os.path.exists(file_path):
            os.remove(file_path)
            