from src.database import Base
from sqlalchemy import Column, Integer,VARCHAR

class User(Base):
    __tablename__ = "user_register"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(VARCHAR(100), unique=True, index=True)
    email = Column (VARCHAR(100), unique=True, index=True)
    hashed_password = Column(VARCHAR(100))
    role = Column(VARCHAR(255)) 