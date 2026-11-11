# Signed contract copies and invoice email

PRs #82–85 merged through `80627ea`. The signed PDF includes a contract-details cover. The customer signing page displays the product and period when available and offers one signed-copy download. Staff can still download the signing receipt from the signed request.

**Email contract and invoice** opens an editable composer addressed to the signer. It uses a configured From address and supports multiple CC recipients, an editable subject, body and sign-off, a Worktello contract link and a required Zoho Books invoice share link.

[Merged-main CI](https://github.com/digisol-ae/COEX/actions/runs/43035086524) passed. Production deployment, authenticated signing and recipient delivery remain unverified for these changes. The mail worker must support labeled HTML links before accepting the delivery workflow.
