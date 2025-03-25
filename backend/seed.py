from app import app, db
from app.models.user import User
from app.models.notebook import Notebook
from app.models.source import Source


def seed_database():
    with app.app_context():
        # Create a user
        user = User(name="John Doe", email="user@example.com")
        user.set_password("123456")
        db.session.add(user)
        db.session.commit()

        # Create a notebook
        notebook = Notebook(user_id=user.id, name="My First Notebook")
        db.session.add(notebook)
        db.session.commit()

        # Create a source
        source = Source(
            notebook_id=notebook.id,
            file_type="text",
            title="Sample Document",
            description="This is a sample document.",
            faiss_file_name="doc1.faiss",
            file_path="uploads/sample.txt",
        )
        db.session.add(source)
        db.session.commit()


if __name__ == "__main__":
    seed_database()
