const API_BASE = "http://localhost:8000";

// 로그인 상태 저장 (예: role: "employee" 또는 "admin", name)
let loggedInUser = null;

// 직원 목록을 라디오 버튼으로 생성하는 함수 (관리자 직원 API 사용)
async function loadEmployeeRadio() {
  try {
    const response = await fetch(`${API_BASE}/admin/employees/`);
    if (!response.ok) throw new Error("직원 목록 불러오기 실패");
    const employees = await response.json();
    const radioListDiv = document.getElementById("employee-radio-list");
    radioListDiv.innerHTML = "";
    employees.forEach(emp => {
      const label = document.createElement("label");
      label.style.marginRight = "10px";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "employee";
      radio.value = emp.name;  // 직원 이름을 값으로 사용
      label.appendChild(radio);
      label.appendChild(document.createTextNode(" " + emp.name));
      radioListDiv.appendChild(label);
    });
  } catch (error) {
    alert(error.message);
  }
}

// 근태 요약 데이터를 불러와서 화면에 표로 출력하는 함수
async function loadAttendanceSummary() {
  try {
    const response = await fetch(`${API_BASE}/attendance/summary`);
    if (!response.ok) throw new Error("근태 요약 데이터 불러오기 실패");
    const summary = await response.json();
    let dailyHTML = "<table><tr><th>직원</th><th>날짜</th><th>근무시간 (시간)</th></tr>";
    for (let emp in summary.daily) {
      for (let day in summary.daily[emp]) {
        dailyHTML += `<tr><td>${emp}</td><td>${day}</td><td>${summary.daily[emp][day].toFixed(2)}</td></tr>`;
      }
    }
    dailyHTML += "</table>";
    document.getElementById("daily-summary").innerHTML = dailyHTML;

    let monthlyHTML = "<table><tr><th>직원</th><th>월</th><th>총 근무시간 (시간)</th></tr>";
    for (let emp in summary.monthly) {
      for (let month in summary.monthly[emp]) {
        monthlyHTML += `<tr><td>${emp}</td><td>${month}</td><td>${summary.monthly[emp][month].toFixed(2)}</td></tr>`;
      }
    }
    monthlyHTML += "</table>";
    document.getElementById("monthly-summary").innerHTML = monthlyHTML;
  } catch (error) {
    alert(error.message);
  }
}

// ----- 로그인 및 관리자 등록 관련 처리 ----- //

// 탭 전환 처리
document.getElementById("show-employee-login").addEventListener("click", (e) => {
  document.getElementById("employee-login-form-div").style.display = "block";
  document.getElementById("admin-login-form-div").style.display = "none";
  document.getElementById("admin-register-form-div").style.display = "none";
});

document.getElementById("show-admin-login").addEventListener("click", (e) => {
  document.getElementById("employee-login-form-div").style.display = "none";
  document.getElementById("admin-login-form-div").style.display = "block";
  document.getElementById("admin-register-form-div").style.display = "none";
});

document.getElementById("show-admin-register").addEventListener("click", (e) => {
  document.getElementById("employee-login-form-div").style.display = "none";
  document.getElementById("admin-login-form-div").style.display = "none";
  document.getElementById("admin-register-form-div").style.display = "block";
});

// 직원 로그인 폼 처리
document.getElementById("employee-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("employee-login-name").value;
    const password = document.getElementById("employee-login-password").value;
    try {
      const response = await fetch(`${API_BASE}/login/employee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password })
      });
      if (!response.ok) throw new Error("직원 로그인 실패");
      const data = await response.json();
      loggedInUser = data;
      document.getElementById("login-result").textContent = data.message;
      
      // 로그인 성공 후 메인 내비게이션과 콘텐츠 표시
      document.getElementById("login-section").style.display = "none";
      document.getElementById("main-nav").style.display = "block";
      document.getElementById("main-content").style.display = "block";
      
      // 직원 로그인인 경우: 예약 관리와 관리자 패널 메뉴 숨기기
      const reservationLink = document.querySelector('a.nav-link[data-section="reservation-section"]');
      if (reservationLink) {
        reservationLink.parentElement.style.display = "none";
      }
      const adminLink = document.getElementById("admin-nav-link");
      if (adminLink) {
        adminLink.style.display = "none";
      }
      // 직원 로그인 시 관리자 패널 화면도 숨기기 (혹은 노출되지 않도록)
      const adminPanelSection = document.getElementById("admin-panel-section");
      if (adminPanelSection) {
        adminPanelSection.style.display = "none";
      }
      
      // 기본적으로 직원 근태 관리 화면 표시
      document.getElementById("attendance-section").style.display = "block";
    } catch (error) {
      document.getElementById("login-result").textContent = error.message;
    }
  });
  
  // 관리자 로그인 폼 처리
  document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("admin-login-name").value;
    const password = document.getElementById("admin-login-password").value;
    try {
      const response = await fetch(`${API_BASE}/login/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password })
      });
      if (!response.ok) throw new Error("관리자 로그인 실패");
      const data = await response.json();
      loggedInUser = data;
      document.getElementById("login-result").textContent = data.message;
      
      // 관리자 로그인인 경우: 모든 메뉴 항목 보이도록 설정
      document.getElementById("login-section").style.display = "none";
      document.getElementById("main-nav").style.display = "block";
      document.getElementById("main-content").style.display = "block";
      
      // 예약 관리 메뉴 항목 보이기
      const reservationLink = document.querySelector('a.nav-link[data-section="reservation-section"]');
      if (reservationLink) {
        reservationLink.parentElement.style.display = "block";
      }
      // 관리자 패널 메뉴 보이기
      const adminLink = document.getElementById("admin-nav-link");
      if (adminLink) {
        adminLink.style.display = "block";
      }
      // 관리자 패널 화면 보이기
      document.getElementById("admin-panel-section").style.display = "block";
      // 관리자 로그인 시 기본적으로 관리자 패널의 매출 관리 화면을 표시 (또는 원하는 화면)
      document.querySelectorAll(".admin-content-section").forEach(section => {
        section.style.display = "none";
      });
      document.getElementById("admin-sales-section").style.display = "block";
    } catch (error) {
      document.getElementById("login-result").textContent = error.message;
    }
  });
  

// 관리자 등록 폼 처리
document.getElementById("admin-register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("admin-register-name").value;
  const password = document.getElementById("admin-register-password").value;
  try {
    const response = await fetch(`${API_BASE}/register/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password })
    });
    if (!response.ok) throw new Error("관리자 등록 실패");
    const data = await response.json();
    document.getElementById("login-result").textContent = "관리자 등록 성공: " + data.name;
    // 등록 후 관리자 로그인 폼을 표시
    document.getElementById("admin-register-form-div").style.display = "none";
    document.getElementById("admin-login-form-div").style.display = "block";
  } catch (error) {
    document.getElementById("login-result").textContent = error.message;
  }
});

// 로그아웃 처리
document.getElementById("logout-link").addEventListener("click", (e) => {
  e.preventDefault();
  loggedInUser = null;
  // 로그인 화면으로 전환
  document.getElementById("login-section").style.display = "block";
  document.getElementById("main-nav").style.display = "none";
  document.getElementById("main-content").style.display = "none";
});

// ----- 일반 내비게이션 (로그인 후) ----- //
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetSection = e.target.getAttribute("data-section");
    document.querySelectorAll(".content-section").forEach(section => {
      section.style.display = "none";
    });
    document.getElementById(targetSection).style.display = "block";
    if (targetSection === "attendance-section") {
      loadEmployeeRadio();
    }
  });
});

// 관리자 탭 클릭 (이미 로그인된 관리자는 관리자 패널로 이동)
document.getElementById("admin-nav-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelectorAll(".content-section").forEach(section => {
    section.style.display = "none";
  });
  document.getElementById("admin-panel-section").style.display = "block";
});

// 관리자 서브 메뉴 내 화면 전환
document.querySelectorAll(".admin-sub-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetSection = e.target.getAttribute("data-section");
    document.querySelectorAll(".admin-content-section").forEach(section => {
      section.style.display = "none";
    });
    document.getElementById(targetSection).style.display = "block";
  });
});

// ----- 회원 관리 관련 (기존 코드) ----- //
document.getElementById("member-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const memberData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    membership_type: document.getElementById("membership_type").value,
    start_date: document.getElementById("start_date").value,
    end_date: document.getElementById("end_date").value
  };
  try {
    const response = await fetch(`${API_BASE}/members/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberData)
    });
    if (!response.ok) throw new Error("회원 등록 실패");
    const data = await response.json();
    document.getElementById("member-result").textContent = "등록된 회원 ID: " + data.id;
  } catch (error) {
    document.getElementById("member-result").textContent = error.message;
  }
});

document.getElementById("load-members").addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE}/members/`);
    if (!response.ok) throw new Error("회원 목록 불러오기 실패");
    const members = await response.json();
    const listElem = document.getElementById("member-list");
    listElem.innerHTML = "";
    members.forEach(member => {
      const li = document.createElement("li");
      li.textContent = `ID: ${member.id}, 이름: ${member.name}, 이메일: ${member.email}`;
      listElem.appendChild(li);
    });
  } catch (error) {
    alert(error.message);
  }
});

// ----- 직원 근태 관리 ----- //
// 출근 등록 (라디오 버튼에서 선택된 직원 이름 사용)
document.getElementById("attendance-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const selectedRadio = document.querySelector('input[name="employee"]:checked');
  if (!selectedRadio) {
    alert("출근할 직원을 선택하세요.");
    return;
  }
  const employeeName = selectedRadio.value;
  try {
    const response = await fetch(`${API_BASE}/attendance/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_name: employeeName })
    });
    if (!response.ok) throw new Error("출근 등록 실패");
    const data = await response.json();
    alert(`출근 등록 완료, 기록 ID: ${data.id}`);
  } catch (error) {
    alert(error.message);
  }
});

// 퇴근 등록 (라디오 버튼에서 선택된 직원 이름 사용)
document.getElementById("checkout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const selectedRadio = document.querySelector('input[name="employee"]:checked');
  if (!selectedRadio) {
    alert("퇴근할 직원을 선택하세요.");
    return;
  }
  const employeeName = selectedRadio.value;
  try {
    const response = await fetch(`${API_BASE}/attendance/checkout_by_name`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_name: employeeName })
    });
    if (!response.ok) throw new Error("퇴근 등록 실패");
    const data = await response.json();
    alert(`퇴근 등록 완료, 기록 ID: ${data.id}`);
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("load-attendance").addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE}/attendance/`);
    if (!response.ok) throw new Error("근태 기록 불러오기 실패");
    const records = await response.json();
    const tbody = document.querySelector("#attendance-table tbody");
    tbody.innerHTML = "";
    records.forEach(record => {
      const tr = document.createElement("tr");
      const checkInTime = new Date(record.check_in);
      const checkOutTime = record.check_out ? new Date(record.check_out) : null;
      let workTime = "";
      if (checkOutTime) {
        const diffMs = checkOutTime - checkInTime;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        workTime = `${diffHrs}시간 ${diffMins}분`;
      }
      tr.innerHTML = `
        <td>${record.id}</td>
        <td>${record.employee_name}</td>
        <td>${checkInTime.toLocaleString()}</td>
        <td>${checkOutTime ? checkOutTime.toLocaleString() : "-"}</td>
        <td>${workTime}</td>
      `;
      tbody.appendChild(tr);
    });
    // 근태 기록 불러온 후 요약 데이터도 갱신
    loadAttendanceSummary();
  } catch (error) {
    alert(error.message);
  }
});

// ----- 예약 관리 관련 (기존 코드 동일) ----- //
document.getElementById("reservation-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const reservationData = {
    customer_name: document.getElementById("customer_name").value,
    reservation_date: document.getElementById("reservation_date").value
  };
  try {
    const response = await fetch(`${API_BASE}/reservations/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reservationData)
    });
    if (!response.ok) throw new Error("예약 등록 실패");
    const data = await response.json();
    document.getElementById("reservation-result").textContent = "예약 등록 완료, ID: " + data.id;
  } catch (error) {
    document.getElementById("reservation-result").textContent = error.message;
  }
});

document.getElementById("load-reservations").addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE}/reservations/`);
    if (!response.ok) throw new Error("예약 목록 불러오기 실패");
    const reservations = await response.json();
    const listElem = document.getElementById("reservation-list");
    listElem.innerHTML = "";
    reservations.forEach(res => {
      const li = document.createElement("li");
      li.textContent = `ID: ${res.id}, 고객: ${res.customer_name}, 날짜: ${new Date(res.reservation_date).toLocaleDateString()}, 상태: ${res.status}`;
      listElem.appendChild(li);
    });
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("sync-naver").addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE}/naver-sync/`);
    if (!response.ok) throw new Error("동기화 실패");
    const result = await response.json();
    document.getElementById("sync-result").textContent = result.detail;
  } catch (error) {
    document.getElementById("sync-result").textContent = error.message;
  }
});

// ----- 관리자 패널 내 [매출 관리] 및 [직원 관리] 관련 (기존 코드 동일) ----- //
document.getElementById("sale-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const saleData = {
    sale_date: document.getElementById("sale_date").value,
    amount: parseFloat(document.getElementById("amount").value)
  };
  try {
    const response = await fetch(`${API_BASE}/sales/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData)
    });
    if (!response.ok) throw new Error("매출 등록 실패");
    const data = await response.json();
    document.getElementById("sale-result").textContent = "매출 등록 완료, ID: " + data.id;
  } catch (error) {
    document.getElementById("sale-result").textContent = error.message;
  }
});

document.getElementById("load-sales").addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE}/sales/`);
    if (!response.ok) throw new Error("매출 목록 불러오기 실패");
    const sales = await response.json();
    const listElem = document.getElementById("sale-list");
    listElem.innerHTML = "";
    sales.forEach(sale => {
      const li = document.createElement("li");
      li.textContent = `ID: ${sale.id}, 날짜: ${new Date(sale.sale_date).toLocaleDateString()}, 금액: ${sale.amount}`;
      listElem.appendChild(li);
    });
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("total-sales").addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE}/sales/total`);
    if (!response.ok) throw new Error("총 매출액 불러오기 실패");
    const result = await response.json();
    document.getElementById("total-sales-result").textContent = "총 매출액: " + result.total_sales;
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("employee-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const employeeData = {
    name: document.getElementById("employee_name_admin").value,
    email: document.getElementById("employee_email_admin").value,
    position: document.getElementById("employee_position_admin").value,
    password: document.getElementById("employee_password_admin").value
  };
  try {
    const response = await fetch(`${API_BASE}/admin/employees/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData)
    });
    if (!response.ok) throw new Error("직원 등록 실패");
    const data = await response.json();
    document.getElementById("employee-result").textContent = "등록된 직원 ID: " + data.id;
  } catch (error) {
    document.getElementById("employee-result").textContent = error.message;
  }
});

document.getElementById("load-employees").addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE}/admin/employees/`);
    if (!response.ok) throw new Error("직원 목록 불러오기 실패");
    const employees = await response.json();
    const listElem = document.getElementById("employee-list");
    listElem.innerHTML = "";
    employees.forEach(emp => {
      const li = document.createElement("li");
      li.textContent = `ID: ${emp.id}, 이름: ${emp.name}, 이메일: ${emp.email}, 직책: ${emp.position}`;
      listElem.appendChild(li);
    });
  } catch (error) {
    alert(error.message);
  }
});
