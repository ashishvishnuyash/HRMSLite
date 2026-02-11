(function () {
  const loading = document.getElementById("dashboard-loading");
  const errorEl = document.getElementById("dashboard-error");
  const content = document.getElementById("dashboard-content");
  const emptyEl = document.getElementById("dashboard-empty");

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

  function showContent(data) {
    loading.classList.add("d-none");
    errorEl.classList.add("d-none");
    emptyEl.classList.add("d-none");
    content.classList.remove("d-none");
    document.getElementById("stat-employees").textContent = data.employees_count;
    document.getElementById("stat-marked").textContent = data.attendance_marked_today;
    document.getElementById("stat-present").textContent = data.present_today;
    document.getElementById("stat-absent").textContent = data.absent_today;
  }

  function showEmpty() {
    loading.classList.add("d-none");
    errorEl.classList.add("d-none");
    content.classList.add("d-none");
    emptyEl.classList.remove("d-none");
  }

  window.loadSummary = function () {
    showLoading();
    fetch(API_BASE + "/api/summary/", {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load summary");
        return res.json();
      })
      .then(function (data) {
        if (data.employees_count === 0 && data.attendance_marked_today === 0) {
          showEmpty();
        } else {
          showContent(data);
        }
      })
      .catch(function (err) {
        showError(err.message || "Something went wrong.");
      });
  };

  loadSummary();
})();
