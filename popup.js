const rootStyles = getComputedStyle(document.documentElement);
const passwordInput = document.getElementById("password-input");
const passwordButton = document.getElementById("password-button");

const CSSBgColors = {
    logBgColor: rootStyles.getPropertyValue("--log-bg-color"),
    warnBgColor: rootStyles.getPropertyValue("--warn-bg-color"),
    errorBgColor: rootStyles.getPropertyValue("--error-bg-color"),
};

let isPasswordShow = false;
passwordButton.innerText = "🧐";

passwordButton.addEventListener("click", () => {
    if (isPasswordShow) {
        passwordButton.innerText = "🧐";
        isPasswordShow = false;
        passwordInput.type = "password";
    } else {
        passwordButton.innerText = "🫣";
        isPasswordShow = true;
        passwordInput.type = "text";
    }
});

const npmInput = document.getElementById("npm-input");
const loginButton = document.getElementById("login-button");
const logContainer = document.getElementById("log-container");

const loginOnProgress = () => {
    loginButton.innerText = "Sedang proses... 📬";
    loginButton.style.opacity = "50%"
    loginButton.style.pointerEvents = "none";
}

const loginDefault = () => {
    loginButton.innerText = "Login ➡️";
    loginButton.style.opacity = "100%"
    loginButton.style.pointerEvents = "auto";
}

const displayLogMessage = (message, bgColor, timeout = 2000) => {
    logContainer.style.display = "block";
    logContainer.style.backgroundColor = bgColor;
    logContainer.innerText = message;

    setTimeout(() => {
        logContainer.style.display = "none";
    }, timeout);
};

const solveCaptcha = async (imageBase64) => {
    try {
        const res = await fetch("https://simkuliah-login-bot-api.vercel.app/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: imageBase64 }),
        });
        const data = await res.json();

        return data.text;
    }
    catch (error) {
        displayLogMessage(
            error.message,
            CSSBgColors.errorBgColor,
        );
        loginDefault();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const result = await chrome.storage.local.get("userData");
    const userData = result.userData || {};

    npmInput.value = userData.npm || "";
    passwordInput.value = userData.password || "";
});

loginButton.addEventListener("click", async () => {
    const npm = npmInput.value;
    const password = passwordInput.value;

    if (!npm || !password) {
        displayLogMessage(
            "NPM atau password tidak valid!",
            CSSBgColors.warnBgColor,
        );
        return;
    }
    loginOnProgress();

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        const [{ result: captchaImageBase64 }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const captchaImage = document.getElementById("captcha-img");
                const canvas = document.createElement("canvas");

                canvas.width = captchaImage.naturalWidth;
                canvas.height = captchaImage.naturalHeight;

                const context = canvas.getContext("2d");
                context.drawImage(captchaImage, 0, 0);

                return canvas.toDataURL("image/png");
            },
        });
        const capcthaText = await solveCaptcha(captchaImageBase64);

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [npm, password, capcthaText],
            func: async (npm, password, capcthaText) => {
                const usernamePageInput = document.querySelector(
                    'input[name="username"]',
                );
                const passwordPageInput = document.querySelector(
                    'input[name="password"]',
                );
                const captchaPageInput = document.querySelector(
                    'input[name="captcha_answer"]',
                );
                const submitButton = document.querySelector(
                    'button[type="submit"]',
                );
                usernamePageInput.value = npm;
                passwordPageInput.value = password;
                captchaPageInput.value = capcthaText;

                setTimeout(() => {
                    submitButton.click();
                }, 1000);
            },
        });
        await chrome.storage.local.set({ userData: { npm, password } });

        displayLogMessage("Proses selesai!", CSSBgColors.logBgColor);
        loginDefault();
    }
    catch (error) {
        displayLogMessage(error.message, CSSBgColors.errorBgColor);
        loginDefault();
    }
});
