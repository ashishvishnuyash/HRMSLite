from django.db import models

class Employee(models.Model):
    employee_id = models.CharField(max_length=32, unique=True)
    full_name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["full_name", "employee_id"]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.employee_id})"


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "P", "Present"
        ABSENT = "A", "Absent"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="attendance_records"
    )
    date = models.DateField()
    status = models.CharField(max_length=1, choices=Status.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "date"], name="uniq_attendance_employee_date"
            )
        ]
        ordering = ["-date", "employee__full_name"]

    def __str__(self) -> str:
        return f"{self.employee} - {self.date} - {self.get_status_display()}"
