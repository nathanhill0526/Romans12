Romans 12 Web App

A single-page web app for the Romans 12 community: a weekly verse and song, a discussion board, a prayer wall, private submissions, and an admin panel with user accounts and customizable permissions.

Status: proof of concept. Everything runs in one HTML file with no backend. Data is saved only in the visitor's own browser, so it is not shared between devices yet. See Limitations and Roadmap.

Features

For everyone

Home page with the text message link, Spotify link, and Romans 12 submission link
Verse of the week and song of the week, plus an archive of past weeks
Study tab with Romans 12 split into three sections and discussion questions
About page with an expandable FAQ

For logged-in members (depends on role)

Discussion board with topic filters, replies, and an Encourage button
Prayer wall with requests, praise reports, "I prayed" counts, mark as answered, and anonymous posting
Private submissions (testimonies, song or verse ideas, questions)
Account tab with change password

For admins and moderators

Users: create accounts, change roles, disable, set a new password, remove
Roles and permissions: a checkbox panel per role, plus the ability to create custom roles
Sign-up settings: open or close public sign-up and choose the role new sign-ups receive
Weekly content: edit the tagline, links, and the verse and song of the week
Submissions inbox: read and delete private submissions
Quick start
Download romans12-poc.html.
Double-click it to open in any modern browser.

That's it. No install, no build step, no server.

Demo logins
Role	Email	Password
Admin	admin@demo.test	admin123
Moderator	mod@demo.test	mod12345
Member	member@demo.test	member123

Use Reset demo data on the Log in tab to wipe everything back to the starting state.

Roles and permissions

Admins always have every permission. Other roles are controlled from Admin → Roles and permissions.

Permission	What it allows
post	Create posts on the discussion board
reply	Reply to posts
like	Use the Encourage and "I prayed" buttons
prayer	Post on the prayer wall
submit	Send private submissions
delete_any	Delete anyone's posts, replies, and prayers
answer_any	Mark any prayer request as answered
view_submissions	Read and delete the submissions inbox
edit_content	Edit the verse, song, links, and tagline
manage_users	Add, disable, and remove users
manage_roles	Edit roles, permissions, and sign-up settings

Default roles: Admin (locked, everything), Moderator, Member, and Guest (what logged-out visitors can do).

Safeguards in the page: you can't disable or remove the last active admin, and non-admins can't promote anyone to admin or edit admins.

Customizing
Links, tagline, verse, and song: log in as an admin and use Admin → Weekly content.
Starting content and demo data: edit DEF_CONTENT and the seed() function near the top of the script, then use Reset demo data so the new defaults load.
Study questions and FAQ: edit the STUDY and FAQ arrays in the script.
Colors: change the CSS variables in :root at the top of the file.
Color palette
Name	Hex
Soft Sky	
#B5C9D6
Wool	
#D1C1B6
Ocean	
#7E9EB2
Hazelnut	
#A47864
Denim	
#3F5F76
Chocolate	
#794E46
Espresso (text)	
#35281F
Paper (background)	
#F4EEE9
Hosting on GitHub Pages
Rename romans12-poc.html to index.html.
Push it to a GitHub repository.
In the repo, go to Settings → Pages, set the source to your main branch and root folder, and save.
After a minute, your site is live at https://<your-username>.github.io/<repo-name>/.

Remember that data is still stored per browser, so each visitor sees their own copy.

Project structure
.
├── index.html   # the whole app: HTML, CSS, and JavaScript
└── README.md

Inside the script, the block between SHIM-START and SHIM-END is a local stand-in for a database and login system. It is the only part that changes when a real backend is added.

Limitations
Not shared between devices. Data lives in the browser's localStorage, so posts and accounts exist only on the device that created them.
Permissions are enforced by the page only. Someone with browser developer tools could bypass them. Real enforcement needs a backend.
Passwords are lightly scrambled, not securely hashed. Do not use real passwords.
No password reset emails. An admin sets a new password instead.
Needs internet for fonts only. Google Fonts load from the web. Without a connection, the page falls back to Georgia and system fonts.
Roadmap
 Connect Firebase (Authentication and Firestore) so posts and accounts are shared across devices
 Firestore security rules that enforce roles and permissions on the server
 Password reset by email
 Real user profile settings
 Optional LAN-only server version for use without internet

The data layer is written to mirror Firebase's function names (doc, setDoc, onSnapshot, signInWithEmailAndPassword, and so on), so switching over means replacing the shim block with Firebase imports.

Browser support

Any current version of Chrome, Edge, Firefox, or Safari.

License

Add a license of your choice here (for example MIT) before making the repository public.
