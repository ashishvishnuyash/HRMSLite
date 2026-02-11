# HRMS Lite

A lightweight Human Resource Management System (HRMS) built with Django. Admin can manage employee records and track daily attendance.

## Features

- **Employee Management**: Add, list, and delete employees (Employee ID, Full Name, Email, Department)
- **Attendance Management**: Mark attendance (Present/Absent) per employee per date; view attendance records
- **Dashboard**: Summary of employees count and today's attendance stats
- **Bonus**: Filter attendance by date; total present days per employee; dashboard summary

## Tech Stack

- **Backend**: Django 6.x (Python)
- **Frontend**: Django templates + vanilla JavaScript
- **Database**: SQLite (default)

## Setup

### Prerequisites

- Python 3.10+
- pip

### Run locally

1. Clone or download this project.

2. Create and activate a virtual environment (optional but recommended):

   ```bash
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   # source .venv/bin/activate   # Linux/macOS
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Run migrations:

   ```bash
   python manage.py migrate
   ```

5. Start the server:

   ```bash
   python manage.py runserver
   ```

6. Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/summary/` | Dashboard stats (employees, attendance today) |
| GET | `/api/employees/` | List all employees |
| POST | `/api/employees/` | Create employee (JSON: employee_id, full_name, email, department) |
| DELETE | `/api/employees/<id>/` | Delete employee |
| GET | `/api/employees/<id>/attendance/` | List attendance for an employee (?date=, ?date_from=, ?date_to=) |
| POST | `/api/employees/<id>/attendance/` | Mark attendance (JSON: date, status) |
| GET | `/api/attendance/` | List all attendance (?date=, ?date_from=, ?date_to=) |

## Assumptions & Limitations

- Single admin user; no authentication required.
- Leave management, payroll, and advanced HR features are out of scope.
- SQLite used by default; for production, use PostgreSQL or MySQL and set `DATABASES` in settings.

## Deployment

- **Backend**: Deploy Django (e.g., on Render, Railway) using `gunicorn` with `myproject.wsgi`.
- **Frontend**: Served by the same Django app (templates + static).
- Set `DEBUG = False`, `ALLOWED_HOSTS`, and use a production database and `collectstatic`.
