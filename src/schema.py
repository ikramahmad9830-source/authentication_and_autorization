from pydantic import BaseModel,EmailStr

# schema for user create 
class User_create(BaseModel):
    id : int
    username : str
    email : EmailStr
    password : str
    role : str

# schema for user  login
class User_login(BaseModel):
    username :str
    password : str 