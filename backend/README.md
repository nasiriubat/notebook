python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -c "import secrets; print(secrets.token_hex(32))"
sudo apt install tesseract-ocr  # For Linux



#creating the db
flask shell
----
from app import db
db.create_all()
exit()
----
#if changes required
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
----
#adding new column
##first make changes in the model then run following cmd
flask db migrate -m "Add file_path column to Source model"
flask db upgrade

#rollback
flask db downgrade

