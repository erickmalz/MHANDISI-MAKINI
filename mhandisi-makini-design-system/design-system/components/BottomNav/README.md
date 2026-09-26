# BottomNav
The mobile customer app’s fixed bottom bar: four or five short destinations.

**Consumer provides:** `items` (`{label, icon, href, active}`) — keep to Home, Explore, Projects, Messages, Profile.

- White surface with a top `mm-border`; the active item gets a filled yellow icon, bold label and `aria-current="page"`.
- Only in the main customer app — never in dense expert/admin workflows.
- Each item is at least 44×44px.
