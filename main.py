from src.database import  engine, Base,get_db
from src.models import User
from fastapi import FastAPI,Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.schema import User_create
from src.utils import get_password_hash,verify_password
import jwt
from datetime import datetime , timedelta,timezone
from fastapi.security import OAuth2PasswordRequestForm,OAuth2PasswordBearer
from jwt import PyJWTError
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os 

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auth & Tokenization API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Auth & Tokenization Gateway",
        "version": "2.0.0",
        "endpoints": ["/login", "/SignUp", "/protected", "/profile", "/user", "/admin", "/health"]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# helper function that help in taking user data 
def create_access_token(data:dict):
    to_encode = data.copy()
    Expire = datetime.now(timezone.utc) + timedelta(minutes=  ACCESS_TOKEN_EXPIRE_MINUTES )
    to_encode.update({"exp":Expire})
    encode_jwt= jwt.encode(to_encode, SECRET_KEY,algorithm = ALGORITHM)
    return encode_jwt



@app.post("/SignUp")
def User_Registration(user:User_create, db : Session= Depends(get_db)):
    # check the existing user 
    existing_user = db.query(User).filter(
        User.username == user.username 
    ).first()

    if existing_user:
        raise HTTPException (status_code=400, detail= "user is already exist")

    hased_pass = get_password_hash(user.password)

    new_user= User(
        username= user.username,
        email= user.email,
        hashed_password= hased_pass,
        role= user.role
    )
        

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    

    # return the new user values except password

    return {
        'id':new_user.id,
        'username':new_user.username,
        'email': new_user.email,
        'role':new_user.role
    }


@app.post("/login")
def user_login(form_data:OAuth2PasswordRequestForm = Depends()
               , db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == form_data.username).first()

    if not existing_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail = "Invalid username")

    if not verify_password(form_data.password, existing_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail = "Invalid password")


    token_data = {'sub': existing_user.username, 'role': existing_user.role}
    token = create_access_token(token_data)
    return {'access_token': token, 'token_type':'bearer'}


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login") 

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    credentials_exception =  HTTPException(
        status_code= status.HTTP_401_UNAUTHORIZED,
        detail = "Could not validate credentials",
        headers = {"WWW-Authenticate": "Bearer"}
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
        username: str = payload.get("sub")
        role : str = payload.get("role")
        if username is None or role is None:
            raise credentials_exception

    except PyJWTError:
        raise credentials_exception

    return {'username': username, 'role': role}


@app.get("/protected")
def protected_route(current_user: dict = Depends(get_current_user)):
    return {"Message": f"Hello, {current_user['username']} | you access a  protected route"}

def require_role(allowed_roles: list[str]):
    def role_cheker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user
    return role_cheker


@app.get("/profile")
def profile (current_user: dict = Depends(require_role(["admin", "user"]))):
    return {
         "success": True, "message": "Profile information retrieved successfully",
           "user": { "username": current_user["username"],
                     "role": current_user["role"] } }
   


@app.get("/user")
def user_dashboard(current_user: dict = Depends(require_role(["user"]))):
    return {
        "success": True,
        "dashboard": "User Dashboard",
        "message": f"Welcome back, {current_user['username']}!",
        "user": {
            "username": current_user["username"],
            "role": current_user["role"]
        }
    }

@app.get("/admin")
def admin_dashboard(current_user: dict = Depends(require_role(["admin"]))):
    return {
        "success": True,
        "dashboard": "Admin Dashboard",
        "message": f"Welcome back, {current_user['username']}!",
        "user": {
            "username": current_user["username"],
            "role": current_user["role"]
        }
    }


