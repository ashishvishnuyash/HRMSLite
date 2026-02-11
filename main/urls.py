from django.urls import path

from . import views

urlpatterns = [
    # UI
    path("", views.dashboard_page, name="dashboard"),
    path("employees/", views.employees_page, name="employees"),
    path("attendance/", views.attendance_page, name="attendance"),
    # API
    path("api/summary/", views.api_summary, name="api_summary"),
    path("api/employees/", views.api_employees, name="api_employees"),
    path("api/employees/<int:employee_pk>/", views.api_employee_detail, name="api_employee_detail"),
    path(
        "api/employees/<int:employee_pk>/attendance/",
        views.api_employee_attendance,
        name="api_employee_attendance",
    ),
    path("api/attendance/", views.api_attendance_list, name="api_attendance_list"),
]
