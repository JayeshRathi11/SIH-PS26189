"""
Bypasses the browser upload widget entirely and talks straight to the
live backend -- use this if the "+ Add New Case" / drag-drop upload in
the app keeps failing/hanging. Same real pipeline (Gemini extraction,
entity resolution) as a normal upload, just triggered by this script
instead of clicking through the flaky UI. Zero extra dependencies --
stdlib only, works with plain `python direct_upload.py`.

EDIT THE THREE VALUES BELOW, then run it.
"""
import json
import mimetypes
import uuid
import urllib.request
import urllib.error
import time

BACKEND = "https://nexustrace-backend.onrender.com"
USERNAME = "investigator_01"
PASSWORD = "Investigate#2026"

# --- Your new case ---
CASE_ID = "DEMO-FIR-11"          # short, unique, no spaces -- becomes the "domain"
CASE_TITLE = "11: New FIR Title Here"
FILE_PATHS = [
    r"C:\path\to\your\document1.pdf",
    r"C:\path\to\your\document2.docx",
]


def req(method, path, token=None, json_body=None, form_data=None):
    url = BACKEND + path
    headers = {}
    body = None
    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if form_data is not None:
        boundary = uuid.uuid4().hex
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        parts = []
        for key, value in form_data.items():
            if isinstance(value, tuple):
                filename, filebytes = value
                ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
                parts.append(
                    f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'
                    f"Content-Type: {ctype}\r\n\r\n".encode("utf-8")
                    + filebytes + b"\r\n"
                )
            else:
                parts.append(
                    f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode("utf-8")
                )
        parts.append(f"--{boundary}--\r\n".encode("utf-8"))
        body = b"".join(parts)

    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=150) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


print("1. Waking backend + logging in (first request can take 30-50s on a cold Render instance)...")
status, body = req("POST", "/auth/login", json_body={"username": USERNAME, "password": PASSWORD})
if status != 200:
    print("LOGIN FAILED:", status, body)
    raise SystemExit(1)
token = body["access_token"]
print("   Logged in as", USERNAME)

print("2. Registering the case so it shows up in the sidebar...")
status, body = req(
    "POST", "/cases", token=token,
    json_body={"id": CASE_ID, "caseId": f"FIR-{CASE_ID}", "title": CASE_TITLE, "tag": "Active"},
)
print("   ", status, body.get("title", body))

print("3. Uploading documents (this is the real pipeline -- same as the UI would trigger)...")
form = {"domain": CASE_ID}
for i, path in enumerate(FILE_PATHS):
    with open(path, "rb") as f:
        form["files"] = (path.split("\\")[-1].split("/")[-1], f.read())
    # One file per request, same domain each time -- the backend ingests each
    # upload incrementally against whatever's already resolved for this case.
    status, body = req("POST", "/pipeline/upload", token=token, form_data=form)
    print(f"   File {i+1}/{len(FILE_PATHS)} ->", status, body)
    job_id = body.get("job_id")

print("4. Polling extraction job status...")
if job_id:
    for _ in range(60):
        status, job = req("GET", f"/pipeline/status/{job_id}", token=token)
        print("   ", job.get("status"), job.get("total_entities"), "entities so far")
        if job.get("status") in ("COMPLETED", "FAILED"):
            break
        time.sleep(3)

print("\nDone. Refresh the app -- the case + extracted entities should already be there.")
