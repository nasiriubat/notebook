from app import db, app
from sqlalchemy import text

def add_is_note_column():
    with app.app_context():
        # Add is_note column if it doesn't exist
        db.session.execute(text("""
            ALTER TABLE source ADD COLUMN is_note BOOLEAN DEFAULT 0;
        """))
        db.session.commit()
        print("Added is_note column to source table")

if __name__ == "__main__":
    add_is_note_column() 