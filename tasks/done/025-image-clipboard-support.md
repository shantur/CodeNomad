---
title: Image Clipboard
description: Support pasting images from the clipboard.
---

Implement Image Clipboard Support

---

### Detect Image Paste

Detect when image data is present in the system clipboard during a paste event.

Prioritize image data over text data if both are present.

---

### Create Image Attachment

Automatically create an image attachment from the pasted image data. Convert the image to a base64 encoded format for internal handling and submission.

Display the image attachment as a chip in the input area.

---

### Acceptance Criteria

- Pasting an image from the clipboard creates an image attachment chip.
- The image data is base64 encoded and associated with the attachment.
- The attachment chip has a suitable display name (e.g., `[Image #1]`).
- Users can clear the image attachment.
