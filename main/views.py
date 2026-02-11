import json
from datetime import date

from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from django.db import IntegrityError
from django.db.models import Count, Q
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils.dateparse import parse_date
from django.views.decorators.http import require_http_methods

from .models import Attendance, Employee


def dashboard_page(request: HttpRequest) -> HttpResponse:
    return render(request, "dashboard.html")


def employees_page(request: HttpRequest) -> HttpResponse:
    return render(request, "employees.html")


def attendance_page(request: HttpRequest) -> HttpResponse:
    return render(request, "attendance.html")


def _json_error(message: str, *, status: int = 400, details: dict | None = None) -> JsonResponse:
    payload: dict = {"error": message}
    if details:
        payload["details"] = details
    return JsonResponse(payload, status=status)


def _parse_json_body(request: HttpRequest) -> tuple[dict | None, JsonResponse | None]:
    if not request.body:
        return {}, None
    try:
        raw = request.body.decode("utf-8")
        if not raw.strip():
            return {}, None
        data = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None, _json_error("Invalid JSON body.", status=400)
    if not isinstance(data, dict):
        return None, _json_error("JSON body must be an object.", status=400)
    return data, None


def _employee_to_dict(e: Employee, total_present: int | None = None) -> dict:
    d = {
        "id": e.id,
        "employee_id": e.employee_id,
        "full_name": e.full_name,
        "email": e.email,
        "department": e.department,
        "created_at": e.created_at.isoformat(),
    }
    if total_present is not None:
        d["total_present_days"] = total_present
    return d


def _attendance_to_dict(a: Attendance) -> dict:
    return {
        "id": a.id,
        "employee_id": a.employee.employee_id,
        "employee_name": a.employee.full_name,
        "date": a.date.isoformat(),
        "status": a.get_status_display(),
        "status_code": a.status,
        "updated_at": a.updated_at.isoformat(),
    }


@require_http_methods(["GET"])
def api_attendance_list(request: HttpRequest) -> JsonResponse:
    qs = Attendance.objects.select_related("employee").all()
    d = request.GET.get("date")
    d_from = request.GET.get("date_from")
    d_to = request.GET.get("date_to")

    if d:
        parsed = parse_date(d)
        if not parsed:
            return _json_error("Invalid date. Use YYYY-MM-DD.", status=400, details={"field": "date"})
        qs = qs.filter(date=parsed)
    else:
        if d_from:
            parsed = parse_date(d_from)
            if not parsed:
                return _json_error(
                    "Invalid date_from. Use YYYY-MM-DD.", status=400, details={"field": "date_from"}
                )
            qs = qs.filter(date__gte=parsed)
        if d_to:
            parsed = parse_date(d_to)
            if not parsed:
                return _json_error(
                    "Invalid date_to. Use YYYY-MM-DD.", status=400, details={"field": "date_to"}
                )
            qs = qs.filter(date__lte=parsed)

    results = [_attendance_to_dict(a) for a in qs.order_by("-date", "employee__full_name")[:500]]
    return JsonResponse({"results": results})


@require_http_methods(["GET"])
def api_summary(request: HttpRequest) -> JsonResponse:
    employees_count = Employee.objects.count()
    attendance_today = Attendance.objects.filter(date=date.today()).count()
    present_today = Attendance.objects.filter(date=date.today(), status=Attendance.Status.PRESENT).count()
    absent_today = Attendance.objects.filter(date=date.today(), status=Attendance.Status.ABSENT).count()

    return JsonResponse(
        {
            "employees_count": employees_count,
            "attendance_marked_today": attendance_today,
            "present_today": present_today,
            "absent_today": absent_today,
        }
    )


@require_http_methods(["GET", "POST"])
def api_employees(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        employees = (
            Employee.objects.annotate(
                _present=Count(
                    "attendance_records", filter=Q(attendance_records__status=Attendance.Status.PRESENT)
                )
            )
            .order_by("full_name")
        )
        return JsonResponse(
            {
                "results": [
                    _employee_to_dict(e, total_present=getattr(e, "_present", 0) or 0)
                    for e in employees
                ]
            }
        )

    data, err = _parse_json_body(request)
    if err:
        return err

    required = ["employee_id", "full_name", "email", "department"]
    missing = [k for k in required if not str(data.get(k, "")).strip()]
    if missing:
        return _json_error("Missing required fields.", status=400, details={"missing": missing})

    employee_id = str(data["employee_id"]).strip()
    full_name = str(data["full_name"]).strip()
    email = str(data["email"]).strip()
    department = str(data["department"]).strip()

    try:
        EmailValidator()(email)
    except ValidationError:
        return _json_error("Invalid email format.", status=400, details={"field": "email"})

    try:
        e = Employee.objects.create(
            employee_id=employee_id,
            full_name=full_name,
            email=email,
            department=department,
        )
    except IntegrityError:
        return _json_error(
            "Duplicate employee_id or email.",
            status=409,
            details={"employee_id": employee_id, "email": email},
        )

    return JsonResponse(_employee_to_dict(e), status=201)


@require_http_methods(["DELETE"])
def api_employee_detail(request: HttpRequest, employee_pk: int) -> JsonResponse:
    e = get_object_or_404(Employee, pk=employee_pk)
    e.delete()
    return JsonResponse({"deleted": True})


@require_http_methods(["GET", "POST"])
def api_employee_attendance(request: HttpRequest, employee_pk: int) -> JsonResponse:
    employee = get_object_or_404(Employee, pk=employee_pk)

    if request.method == "GET":
        # Optional filters: ?date=YYYY-MM-DD or ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
        qs = Attendance.objects.filter(employee=employee)
        d = request.GET.get("date")
        d_from = request.GET.get("date_from")
        d_to = request.GET.get("date_to")

        if d:
            parsed = parse_date(d)
            if not parsed:
                return _json_error("Invalid date. Use YYYY-MM-DD.", status=400, details={"field": "date"})
            qs = qs.filter(date=parsed)
        else:
            if d_from:
                parsed = parse_date(d_from)
                if not parsed:
                    return _json_error(
                        "Invalid date_from. Use YYYY-MM-DD.", status=400, details={"field": "date_from"}
                    )
                qs = qs.filter(date__gte=parsed)
            if d_to:
                parsed = parse_date(d_to)
                if not parsed:
                    return _json_error(
                        "Invalid date_to. Use YYYY-MM-DD.", status=400, details={"field": "date_to"}
                    )
                qs = qs.filter(date__lte=parsed)

        total_present = qs.filter(status=Attendance.Status.PRESENT).count()
        return JsonResponse(
            {
                "employee": _employee_to_dict(employee),
                "results": [_attendance_to_dict(a) for a in qs.order_by("-date")],
                "total_present_days": total_present,
            }
        )

    data, err = _parse_json_body(request)
    if err:
        return err

    missing = [k for k in ["date", "status"] if not str(data.get(k, "")).strip()]
    if missing:
        return _json_error("Missing required fields.", status=400, details={"missing": missing})

    parsed_date = parse_date(str(data["date"]).strip())
    if not parsed_date:
        return _json_error("Invalid date. Use YYYY-MM-DD.", status=400, details={"field": "date"})

    raw_status = str(data["status"]).strip().lower()
    if raw_status in ("present", "p"):
        status_code = Attendance.Status.PRESENT
    elif raw_status in ("absent", "a"):
        status_code = Attendance.Status.ABSENT
    else:
        return _json_error(
            "Invalid status. Use Present or Absent.",
            status=400,
            details={"field": "status", "allowed": ["Present", "Absent"]},
        )

    # Upsert: if already marked for that date, update status.
    obj, created = Attendance.objects.update_or_create(
        employee=employee,
        date=parsed_date,
        defaults={"status": status_code},
    )
    return JsonResponse(_attendance_to_dict(obj), status=201 if created else 200)
