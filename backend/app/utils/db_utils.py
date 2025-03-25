from app import db

def commit_changes():
    """
    Commit changes to the database.
    """
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise e

def add_to_db(instance):
    """
    Add an instance to the database.
    """
    try:
        db.session.add(instance)
        commit_changes()
    except Exception as e:
        raise e

def delete_from_db(instance):
    """
    Delete an instance from the database.
    """
    try:
        db.session.delete(instance)
        commit_changes()
    except Exception as e:
        raise e