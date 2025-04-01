python -m venv venv
venv\Scripts\activate
python -c "import secrets; print(secrets.token_hex(32))"
sudo apt install tesseract-ocr  # For Linux



#creating the db
flask shell
----
from app import db
db.create_all()
exit()
----
#adding new column
##first make changes in the model then run following cmd
flask db migrate -m "Add file_path column to Source model"
##then check and rewrite this in migrate folder if needed
flask db upgrade

#rollback
flask db downgrade

#move files from local to server
first in local go to file to be uploaded then run
 scp -i ../../nasirPC.pem -r ./instance ubuntu@128.214.253.62:/home/ubuntu/thinksync/

