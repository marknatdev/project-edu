import pathlib
e = pathlib.Path("docs/verification/production-release/iteration3-independent")
content = (e / "REVIEW-iteration3-draft.md").read_text(encoding="utf-8")
p = pathlib.Path("docs/verification/production-release/REVIEW.md")
p.write_text(content, encoding="utf-8")
print("Wrote REVIEW.md successfully. Bytes:", p.stat().st_size)
