from sqlalchemy import create_engine 
from sqlalchemy.orm import sessionmaker,declarative_base

db_url = "mysql+pymysql://root:ikram885@127.0.0.1:3306/user_login"

engine = create_engine(db_url)

Base = declarative_base()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()