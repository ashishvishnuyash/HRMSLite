(function () {
  const form = document.getElementById("attendance-form");
  const formError = document.getElementById("mark-form-error");
  const markEmployee = document.getElementById("mark-employee");
  const markDate = document.getElementById("mark-date");
  const markStatus = document.getElementById("mark-status");
  const filterEmployee = document.getElementById("filter-employee");
  const filterDate = document.getElementById("filter-date");
  const filterDateFrom = document.getElementById("filter-date-from");
  const filterDateTo = document.getElementById("filter-date-to");
  const btnFilter = document.getElementById("btn-filter");
  const loading = document.getElementById("attendance-loading");
  const errorEl = document.getElementById("attendance-error");
  const content = document.getElementById("attendance-content");
  const emptyEl = document.getElementById("attendance-empty");
  const tbody = document.getElementById("attendance-tbody");
  const totalPresentInfo = document.getElementById("total-present-info");

  markDate.value = new Date().toISOString().slice(0, 10);

  function populateEmployeeSelects(employees) {
    const opts = '<option value="">-- Select employee --</option>' + employees.map(function (e) {
      return '<option value="' + e.id + '">' + escapeHtml(e.employee_id + " - " + e.full_name) + "</option>";
    }).join("");
    markEmployee.innerHTML = opts;
    const allOpt = '<option value="">All employees</option>' + employees.map(function (e) {
      return '<option value="' + e.id + '">' + escapeHtml(e.employee_id + " - " + e.full_name) + "</option>";
    }).join("");
    filterEmployee.innerHTML = allOpt;
  }

  function showLoading() {
    loading.classList.remove("d-none");
    errorEl.classList.add("d-none");
    content.classList.add("d-none");
    emptyEl.classList.add("d-none");
  }

  function showError(msg) {
    loading.classList.add("d-none");
    errorEl.classList.remove("d-none");
    content.classList.add("d-none");
    emptyEl.classList.add("d-none");
    errorEl.querySelector(".error-msg").textContent = msg;
  }

  function showContent(records, totalPresent) {
    loading.classList.add("d-none");
    errorEl.classList.add("d-none");
    emptyEl.classList.add("d-none");
    content.classList.remove("d-none");
    tbody.innerHTML = records
      .map(function (r) {
        const cls = r.status_code === "P" ? "status-present" : "status-absent";
        return (
          "<tr>" +
          "<td>" + escapeHtml(r.employee_name || r.employee_id) + "</td>" +
          "<td>" + r.date + "</td>" +
          "<td><span class=\"status-badge " + cls + "\">" + r.status + "</span></td>" +
          "</tr>"
        );
      })
      .join("");
    if (totalPresent !== undefined && records.length > 0) {
      totalPresentInfo.textContent = "Total present days (filtered): " + totalPresent;
    } else {
      totalPresentInfo.textContent = "";
    }
  }

  function showEmpty() {
    loading.classList.add("d-none");
    errorEl.classList.add("d-none");
    content.classList.add("d-none");
    emptyEl.classList.remove("d-none");
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function buildAttendanceUrl() {
    const empId = filterEmployee.value;
    const date = filterDate.value;
    const from = filterDateFrom.value;
    const to = filterDateTo.value;
    let url = API_BASE + "/api/attendance/";
    if (empId) {
      url = API_BASE + "/api/employees/" + empId + "/attendance/";
    }
    const params = [];
    if (date) params.push("date=" + encodeURIComponent(date));
    if (from) params.push("date_from=" + encodeURIComponent(from));
    if (to) params.push("date_to=" + encodeURIComponent(to));
    if (params.length) url += (url.indexOf("?") >= 0 ? "&" : "?") + params.join("&");
    return url;
  }

  window.loadAttendance = function () {
    showLoading();
    fetch(API_BASE + "/api/employees/", { headers: { Accept: "application/json" } })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error("Failed to load employees")); })
      .then(function (empData) {
        populateEmployeeSelects(empData.results || []);
        const url = buildAttendanceUrl();
        return fetch(url, { headers: { Accept: "application/json" } }).then(function (res) {
          if (!res.ok) throw new Error("Failed to load attendance");
          return res.json();
        }).then(function (attData) {
          var results = attData.results || [];
          var totalPresent = attData.total_present_days;
          if (results.length === 0) {
            showEmpty();
          } else {
            showContent(results, totalPresent);
          }
        });
      })
      .catch(function (err) {
        showError(err.message || "Something went wrong.");
      });
  };

  btnFilter.addEventListener("click", loadAttendance);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.classList.add("d-none");
    var empId = markEmployee.value;
    var dateVal = markDate.value;
    var statusVal = markStatus.value;
    if (!empId || !dateVal || !statusVal) {
      formError.textContent = "All fields are required.";
      formError.classList.remove("d-none");
      return;
    }
    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    fetch(API_BASE + "/api/employees/" + empId + "/attendance/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
      },
      body: JSON.stringify({ date: dateVal, status: statusVal }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Mark failed");
          return data;
        });
      })
      .then(function () {
        loadAttendance();
      })
      .catch(function (err) {
        formError.textContent = err.message || "Failed to mark attendance.";
        formError.classList.remove("d-none");
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });

  loadAttendance();
})();
