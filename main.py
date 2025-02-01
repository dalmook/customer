from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Date, DateTime, Float, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import uvicorn
from datetime import datetime, date

#########################################
# 데이터베이스 설정
#########################################

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

#########################################
# 모델 정의
#########################################

class Member(Base):
    __tablename__ = "members"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    membership_type = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)

class Attendance(Base):
    __tablename__ = "attendances"
    id = Column(Integer, primary_key=True, index=True)
    employee_name = Column(String, index=True)
    check_in = Column(DateTime, default=datetime.utcnow)
    check_out = Column(DateTime, nullable=True)

class Reservation(Base):
    __tablename__ = "reservations"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, index=True)
    reservation_date = Column(Date)
    status = Column(String, default="예약됨")

class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    sale_date = Column(Date)
    amount = Column(Float)

# 관리자용 직원 모델 (관리자가 등록하는 직원)
class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    position = Column(String)
    password = Column(String)  # 실제 서비스에서는 암호화 필요

# 관리자 모델
class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    password = Column(String)  # 실제 서비스에서는 암호화 필요

#########################################
# 테이블 생성
#########################################

Base.metadata.create_all(bind=engine)

#########################################
# Pydantic 스키마 정의
#########################################

class MemberCreate(BaseModel):
    name: str
    email: str
    membership_type: str
    start_date: date
    end_date: date

class MemberOut(MemberCreate):
    id: int
    class Config:
        orm_mode = True

class AttendanceCreate(BaseModel):
    employee_name: str

class AttendanceOut(BaseModel):
    id: int
    employee_name: str
    check_in: datetime
    check_out: datetime | None = None
    class Config:
        orm_mode = True

class ReservationCreate(BaseModel):
    customer_name: str
    reservation_date: date

class ReservationOut(BaseModel):
    id: int
    customer_name: str
    reservation_date: date
    status: str
    class Config:
        orm_mode = True

class SaleCreate(BaseModel):
    sale_date: date
    amount: float

class SaleOut(BaseModel):
    id: int
    sale_date: date
    amount: float
    class Config:
        orm_mode = True

# 퇴근 등록 요청 모델 (직원 이름 기반)
class CheckoutRequest(BaseModel):
    employee_name: str

# 관리자용 직원 입력 모델
class EmployeeCreate(BaseModel):
    name: str
    email: str
    position: str
    password: str

class EmployeeOut(EmployeeCreate):
    id: int
    class Config:
        orm_mode = True

# 로그인 모델
class EmployeeLogin(BaseModel):
    name: str
    password: str

class AdminLogin(BaseModel):
    name: str
    password: str

# 관리자 등록 모델
class AdminCreate(BaseModel):
    name: str
    password: str

class AdminOut(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

#########################################
# DB 세션 의존성 주입
#########################################

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#########################################
# FastAPI 애플리케이션 생성 및 CORS 설정
#########################################

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#########################################
# API 엔드포인트
#########################################

# [관리자 등록 엔드포인트]
@app.post("/register/admin", response_model=AdminOut)
def register_admin(admin_data: AdminCreate, db: Session = Depends(get_db)):
    existing = db.query(Admin).filter(Admin.name == admin_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")
    new_admin = Admin(name=admin_data.name, password=admin_data.password)
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin

# [로그인 엔드포인트]
@app.post("/login/employee")
def login_employee(login: EmployeeLogin, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.name == login.name, Employee.password == login.password).first()
    if not emp:
        raise HTTPException(status_code=401, detail="Invalid employee credentials")
    return {"message": "Employee login successful", "role": "employee", "name": emp.name}

@app.post("/login/admin")
def login_admin(login: AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.name == login.name, Admin.password == login.password).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return {"message": "Admin login successful", "role": "admin", "name": admin.name}

# [회원 관리]
@app.post("/members/", response_model=MemberOut)
def create_member(member: MemberCreate, db: Session = Depends(get_db)):
    db_member = Member(**member.dict())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@app.get("/members/", response_model=list[MemberOut])
def read_members(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    members = db.query(Member).offset(skip).limit(limit).all()
    return members

# [직원 근태 관리]
@app.post("/attendance/", response_model=AttendanceOut)
def check_in(attendance: AttendanceCreate, db: Session = Depends(get_db)):
    db_attendance = Attendance(employee_name=attendance.employee_name, check_in=datetime.utcnow())
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@app.put("/attendance/{attendance_id}/checkout", response_model=AttendanceOut)
def check_out(attendance_id: int, db: Session = Depends(get_db)):
    db_attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not db_attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db_attendance.check_out = datetime.utcnow()
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@app.put("/attendance/checkout_by_name", response_model=AttendanceOut)
def check_out_by_employee(checkout: CheckoutRequest, db: Session = Depends(get_db)):
    record = (
        db.query(Attendance)
        .filter(Attendance.employee_name == checkout.employee_name, Attendance.check_out == None)
        .order_by(Attendance.check_in.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="No active check-in record found for employee")
    record.check_out = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record

@app.get("/attendance/", response_model=list[AttendanceOut])
def read_attendances(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    records = db.query(Attendance).offset(skip).limit(limit).all()
    return records

# [예약 관리]
@app.post("/reservations/", response_model=ReservationOut)
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db)):
    db_reservation = Reservation(**reservation.dict())
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation

@app.get("/reservations/", response_model=list[ReservationOut])
def read_reservations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reservations = db.query(Reservation).offset(skip).limit(limit).all()
    return reservations

@app.get("/naver-sync/")
def sync_naver_reservations(db: Session = Depends(get_db)):
    sample_reservations = [
        {"customer_name": "고객A", "reservation_date": date.today(), "status": "예약됨"},
        {"customer_name": "고객B", "reservation_date": date.today(), "status": "예약됨"}
    ]
    for res in sample_reservations:
        db_reservation = Reservation(**res)
        db.add(db_reservation)
    db.commit()
    return {"detail": "네이버예약 데이터 동기화 완료"}

# [매출 관리]
@app.post("/sales/", response_model=SaleOut)
def create_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    db_sale = Sale(**sale.dict())
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    return db_sale

@app.get("/sales/", response_model=list[SaleOut])
def read_sales(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    sales = db.query(Sale).offset(skip).limit(limit).all()
    return sales

@app.get("/sales/total")
def total_sales(db: Session = Depends(get_db)):
    total = db.query(func.sum(Sale.amount)).scalar() or 0.0
    return {"total_sales": total}

# [관리자용 직원 관리] (직원은 관리자가 추가)
@app.post("/admin/employees/", response_model=EmployeeOut)
def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    try:
        db_employee = Employee(**employee.dict())
        db.add(db_employee)
        db.commit()
        db.refresh(db_employee)
        return db_employee
    except Exception as e:
        db.rollback()
        # 로그에 에러 출력 또는 상세 정보 반환 (개발 시에만)
        print("직원 등록 중 오류 발생:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/employees/", response_model=list[EmployeeOut])
def read_employees(db: Session = Depends(get_db)):
    return db.query(Employee).all()

# [직원 근태 요약 API]
@app.get("/attendance/summary")
def attendance_summary(db: Session = Depends(get_db)):
    """
    check_out이 기록된 출퇴근 기록을 기반으로,
    각 직원별 일별 근무시간과 월별 총 근무시간을 계산하여 반환합니다.
    """
    records = db.query(Attendance).filter(Attendance.check_out != None).all()
    daily = {}
    monthly = {}
    for r in records:
        work_time = (r.check_out - r.check_in).total_seconds() / 3600  # 시간 단위
        emp = r.employee_name
        day_str = r.check_in.date().isoformat()
        month_str = r.check_in.strftime("%Y-%m")
        if emp not in daily:
            daily[emp] = {}
        if day_str not in daily[emp]:
            daily[emp][day_str] = 0
        daily[emp][day_str] += work_time
        if emp not in monthly:
            monthly[emp] = {}
        if month_str not in monthly[emp]:
            monthly[emp][month_str] = 0
        monthly[emp][month_str] += work_time
    return {"daily": daily, "monthly": monthly}

#########################################
# 정적 파일 서빙 및 루트에서 index.html 반환
#########################################

@app.get("/")
async def get_index():
    return FileResponse("static/index.html")

app.mount("/static", StaticFiles(directory="static"), name="static")

#########################################
# 애플리케이션 실행
#########################################

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
