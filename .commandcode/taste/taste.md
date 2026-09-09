# Taste
See [taste/taste.md](taste/taste.md)

- Communicates in Indonesian (Bahasa Indonesia) in requests and expects the assistant to reply in Indonesian as well; code comments written by the assistant are also in Indonesian. Confidence: 0.6

- On Windows environments where pandoc is unavailable and Python is only a Microsoft Store stub, prefers generating .docx files with the Node.js `docx` library (script placed in a temp scratchpad folder, not the project repo, so the repo stays clean and the file can be regenerated on demand). Confidence: 0.5
- Prefers business/document variables that appear in printed output (e.g. PO sender name & phone) to be made configurable via a settings menu (backend setting keys + settings UI) with sensible defaults, rather than hardcoded in the document template. Confidence: 0.6
