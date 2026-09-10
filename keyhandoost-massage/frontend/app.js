const apiBase = "/api";

// ثبت رویدادها در انتهای فایل انجام می‌شود تا فرم ثبت‌نام بعد از بارگذاری کامل صفحه فعال باشد.
const tokenName = "letter_token";

const state = {
    token: localStorage.getItem(tokenName),
    user: null,
    letter: null,
};

const el = {
    loginView: document.getElementById("loginView"),
    appView: document.getElementById("appView"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    authSwitchButton: document.getElementById("authSwitchButton"),
    authHint: document.getElementById("authHint"),
    demoUsers: document.getElementById("demoUsers"),
    loginMessage: document.getElementById("loginMessage"),
    currentUserName: document.getElementById("currentUserName"),
    logoutButton: document.getElementById("logoutButton"),
    letterForm: document.getElementById("letterForm"),
    receiverId: document.getElementById("receiverId"),
    composeMessage: document.getElementById("composeMessage"),
    inboxList: document.getElementById("inboxList"),
    sentList: document.getElementById("sentList"),
    dialog: document.getElementById("letterDialog"),
    dialogDirection: document.getElementById("dialogDirection"),
    dialogSubject: document.getElementById("dialogSubject"),
    dialogMeta: document.getElementById("dialogMeta"),
    dialogBody: document.getElementById("dialogBody"),
    downloadButton: document.getElementById("downloadButton"),
};

function showMessage(target, text = "", type = "") {
    target.textContent = text;
    target.className = `message ${type}`.trim();
}

async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});

    if (state.token) {
        headers.set("Authorization", `Bearer ${state.token}`);
    }

    if (options.body && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${apiBase}${path}`, { ...options, headers });

    if (response.status === 401 && path !== "/auth/login") {
        logout();
        throw new Error("نشست شما پایان یافته است.");
    }

    if (!response.ok) {
        let message = "در انجام درخواست خطایی رخ داد.";
        try {
            const data = await response.json();
            if (typeof data.detail === "string") {
                message = data.detail;
            }
        } catch (error) {
            message = "پاسخ سرور قابل خواندن نیست.";
        }
        throw new Error(message);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return response.json();
    }
    return response;
}

function showRegister() {
    el.loginMessage.textContent = "";
    el.loginForm.classList.add("hidden");
    el.registerForm.classList.remove("hidden");
    el.demoUsers.classList.add("hidden");
    el.authHint.textContent = "برای ساخت حساب جدید اطلاعات زیر را وارد کنید.";
    el.authSwitchButton.textContent = "بازگشت به ورود";
    showMessage(el.loginMessage);
}

function showLogin() {
    el.loginMessage.textContent = "";
    el.registerForm.classList.add("hidden");
    el.loginForm.classList.remove("hidden");
    el.demoUsers.classList.remove("hidden");
    el.authHint.textContent = "برای ورود از یکی از حساب‌های نمونه استفاده کنید.";
    el.authSwitchButton.textContent = "ثبت نام کاربر جدید";
    showMessage(el.loginMessage);
}

async function register(event) {
    event.preventDefault();
    showMessage(el.loginMessage, "در حال ساخت حساب...");

    const data = new FormData(el.registerForm);
    if (data.get("password") !== data.get("password_confirm")) {
        showMessage(el.loginMessage, "رمز عبور و تکرار آن یکسان نیست.", "error");
        return;
    }

    try {
        const result = await request("/auth/register", {
            method: "POST",
            body: JSON.stringify({
                username: data.get("username"),
                full_name: data.get("full_name"),
                password: data.get("password"),
            }),
        });

        state.token = result.access_token;
        state.user = result.user;
        localStorage.setItem(tokenName, state.token);
        el.registerForm.reset();
        await openApp();
    } catch (error) {
        showMessage(el.loginMessage, error.message, "error");
    }
}

async function login(event) {
    event.preventDefault();
    showMessage(el.loginMessage, "در حال ورود...");

    const data = new FormData(el.loginForm);

    try {
        const result = await request("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                username: data.get("username"),
                password: data.get("password"),
            }),
        });

        state.token = result.access_token;
        state.user = result.user;
        localStorage.setItem(tokenName, state.token);
        await openApp();
    } catch (error) {
        showMessage(el.loginMessage, error.message, "error");
    }
}

function logout() {
    state.token = null;
    state.user = null;
    state.letter = null;
    localStorage.removeItem(tokenName);
    el.appView.classList.add("hidden");
    el.loginView.classList.remove("hidden");
    el.loginForm.reset();
    showMessage(el.loginMessage);
}

async function openApp() {
    if (!state.user) {
        state.user = await request("/auth/me");
    }

    el.currentUserName.textContent = state.user.full_name;
    el.loginView.classList.add("hidden");
    el.appView.classList.remove("hidden");
    showMessage(el.loginMessage);

    await loadUsers();
    await loadLetters("inbox");
}

async function loadUsers() {
    const users = await request("/users");
    el.receiverId.replaceChildren();

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = "گیرنده را انتخاب کنید";
    firstOption.disabled = true;
    firstOption.selected = true;
    el.receiverId.appendChild(firstOption);

    users.forEach((user) => {
        const option = document.createElement("option");
        option.value = user.id;
        option.textContent = `${user.full_name} (${user.username})`;
        el.receiverId.appendChild(option);
    });
}

function formatDate(dateText) {
    return new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(dateText));
}

function createLetterButton(letter, type) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letter-item";

    if (type === "inbox" && !letter.is_read) {
        button.classList.add("unread");
    }

    const title = document.createElement("strong");
    title.textContent = letter.subject;

    const person = type === "inbox" ? letter.sender.full_name : letter.receiver.full_name;
    const direction = type === "inbox" ? "از" : "به";

    const meta = document.createElement("span");
    meta.textContent = `${direction}: ${person} | ${formatDate(letter.created_at)}`;

    const preview = document.createElement("span");
    preview.textContent = letter.body.length > 90 ? `${letter.body.slice(0, 90)}...` : letter.body;

    const status = document.createElement("span");
    status.className = "letter-status";
    status.textContent = letter.has_attachment ? "دارای پیوست" : "مشاهده";

    button.append(title, meta, preview, status);
    button.addEventListener("click", () => openLetter(letter.id, type));
    return button;
}

async function loadLetters(type) {
    const target = type === "inbox" ? el.inboxList : el.sentList;
    target.innerHTML = '<p class="empty">در حال دریافت اطلاعات...</p>';

    try {
        const letters = await request(`/letters/${type}`);
        target.replaceChildren();

        if (letters.length === 0) {
            const message = document.createElement("p");
            message.className = "empty";
            message.textContent = type === "inbox" ? "نامه دریافتی وجود ندارد." : "نامه ارسالی وجود ندارد.";
            target.appendChild(message);
            return;
        }

        letters.forEach((letter) => {
            target.appendChild(createLetterButton(letter, type));
        });
    } catch (error) {
        target.innerHTML = "";
        const message = document.createElement("p");
        message.className = "empty";
        message.textContent = error.message;
        target.appendChild(message);
    }
}

async function sendLetter(event) {
    event.preventDefault();
    showMessage(el.composeMessage, "در حال ارسال...");

    try {
        const formData = new FormData(el.letterForm);
        const result = await request("/letters", {
            method: "POST",
            body: formData,
        });

        el.letterForm.reset();
        showMessage(el.composeMessage, `نامه «${result.subject}» ارسال شد.`, "success");
        await loadUsers();
        await loadLetters("sent");
    } catch (error) {
        showMessage(el.composeMessage, error.message, "error");
    }
}

async function openLetter(letterId, type) {
    try {
        const letter = await request(`/letters/${letterId}`);
        state.letter = letter;

        el.dialogDirection.textContent = type === "inbox" ? "نامه دریافتی" : "نامه ارسال‌شده";
        el.dialogSubject.textContent = letter.subject;
        el.dialogMeta.textContent = `فرستنده: ${letter.sender.full_name} | گیرنده: ${letter.receiver.full_name} | ${formatDate(letter.created_at)}`;
        el.dialogBody.textContent = letter.body;
        el.downloadButton.classList.toggle("hidden", !letter.has_attachment);
        el.downloadButton.textContent = letter.has_attachment ? `دانلود ${letter.attachment_name}` : "";
        el.dialog.showModal();

        if (type === "inbox") {
            await loadLetters("inbox");
        }
    } catch (error) {
        window.alert(error.message);
    }
}

async function downloadAttachment() {
    if (!state.letter) {
        return;
    }

    try {
        const response = await request(`/letters/${state.letter.id}/attachment`);
        const file = await response.blob();
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = state.letter.attachment_name || "attachment";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        window.alert(error.message);
    }
}

function changePanel(name) {
    document.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.view === name);
    });

    ["inbox", "sent", "compose"].forEach((panelName) => {
        document.getElementById(`${panelName}Panel`).classList.toggle("hidden", panelName !== name);
    });

    if (name === "inbox" || name === "sent") {
        loadLetters(name);
    }
}

el.loginForm.addEventListener("submit", login);
el.registerForm.addEventListener("submit", register);
el.authSwitchButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (el.registerForm.classList.contains("hidden")) {
        showRegister();
    } else {
        showLogin();
    }
});
el.logoutButton.addEventListener("click", logout);
el.letterForm.addEventListener("submit", sendLetter);
el.downloadButton.addEventListener("click", downloadAttachment);
document.getElementById("closeDialogButton").addEventListener("click", () => el.dialog.close());

document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => changePanel(tab.dataset.view));
});

document.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", () => loadLetters(button.dataset.refresh));
});

async function start() {
    if (!state.token) {
        return;
    }

    try {
        await openApp();
    } catch (error) {
        logout();
    }
}

start();
