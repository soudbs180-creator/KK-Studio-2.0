# Intent

T5 closes the local submission safety gap exposed by application shutdown or network loss during image generation. A task must have a durable identity and intent before a provider request starts, and the UI must preserve an explicit unknown state when the provider may have accepted work but the client cannot confirm it.

The scope of this change is the existing Web IndexedDB and Desktop snapshot contracts, their recovery behavior, and a reviewable static Web deployment helper. A packaged, independently running TaskHost remains a follow-up because the current Node gateway is not part of the Tauri bundle or UI request path.
