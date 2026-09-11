# Golden Pride Hub 4.3

## Release highlights
- New black/gold visual refresh optimized for mobile.
- Separate Admin Control Center with dedicated tabs for broadcasts, announcements, events, members, gallery and achievements.
- Admin can type any custom Live Broadcast message.
- Live messages appear upper-center on Home (`index.html`) and Dashboard, plus the live message feed.
- Fixed malformed stylesheet markup on Home and corrected notification icon path.
- Version/update metadata set to 4.3.

## Firebase
Keep your existing Firebase configuration. If your current Firestore rules already contain the broadcast rules, keep them. Otherwise merge the broadcast rules from `FIRESTORE_RULES_V5.2_BROADCAST.txt` into your existing rules rather than replacing the whole ruleset.
