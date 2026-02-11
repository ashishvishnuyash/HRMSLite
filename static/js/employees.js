(function () {
  const form = document.getElementById("employee-form");
  const formError = document.getElementById("form-error");
  const loading = document.getElementById("employees-loading");
  const errorEl = document.getElementById("employees-error");
  const content = document.getElementById("employees-content");
  const emptyEl = document.getElementById("employees-empty");
  const tbody = document.getElementById("employees-tbody");

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

  function showContent(employees) {
    loading.classList.add("d-none");
    errorEl.classList.add("d-none");
    emptyEl.classList.add("d-none");
    content.classList.remove("d-none");
    tbody.innerHTML = employees
      .map(function (e) {
        const present = e.total_present_days !== undefined ? e.total_present_days : "-";
        return (
          "<tr data-id=\"" +
          e.id +
          "\">" +
          "<td>" + escapeHtml(e.employee_id) + "</td>" +
          "<td>" + escapeHtml(e.full_name) + "</td>" +
          "<td>" + escapeHtml(e.email) + "</td>" +
          "<td>" + escapeHtml(e.department) + "</td>" +
          "<td>" + present + "</td>" +
          "<td>" +
          '<button type="button" class="btn btn-outline-danger btn-sm btn-delete" data-id="' +
          e.id +
          '" data-name="' +
          escapeAttr(e.full_name) +
          '">Delete</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    tbody.querySelectorAll(".btn-delete").forEach(function (btn) {
      btn.addEventListener("click", handleDelete);
    });
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

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  window.loadEmployees = function () {
    showLoading();
    fetch(API_BASE + "/api/employees/", {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load employees");
        return res.json();
      })
      .then(function (data) {
        if (!data.results || data.results.length === 0) {
          showEmpty();
        } else {
          showContent(data.results);
        }
      })
      .catch(function (err) {
        showError(err.message || "Something went wrong.");
      });
  };

  function handleDelete(e) {
    const btn = e.currentTarget;
    const id = btn.getAttribute("data-id");
    const name = btn.getAttribute("data-name");
    if (!confirm("Delete employee " + name + "?")) return;
    btn.disabled = true;
    fetch(API_BASE + "/api/employees/" + id + "/", {
      method: "DELETE",
      headers: {
        "X-CSRFToken": CSRF_TOKEN,
        "Content-Type": "application/json",
      },
    })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || "Delete failed"); });
        loadEmployees();
      })
      .catch(function (err) {
        alert(err.message || "Failed to delete");
        btn.disabled = false;
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.classList.add("d-none");
    const payload = {
      employee_id: document.getElementById("employee_id").value.trim(),
      full_name: document.getElementById("full_name").value.trim(),
      email: document.getElementById("email").value.trim(),
      department: document.getElementById("department").value.trim(),
    };
    if (!payload.employee_id || !payload.full_name || !payload.email || !payload.department) {
      formError.textContent = "All fields are required.";
      formError.classList.remove("d-none");
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    fetch(API_BASE + "/api/employees/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
      },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Add failed");
          return data;
        });
      })
      .then(function () {
        form.reset();
        loadEmployees();
      })
      .catch(function (err) {
        formError.textContent = err.message || "Failed to add employee.";
        formError.classList.remove("d-none");
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });

  loadEmployees();
})();
