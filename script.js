(function () {
  var APP_ROOT = ".";
  let currentPath = APP_ROOT;
  const contentEl = document.getElementById("content");
  const breadcrumbEl = document.getElementById("breadcrumb");
  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalFooter = document.getElementById("modal-footer");
  const modalClose = document.getElementById("modal-close");
  const uploadInput = document.getElementById("upload-input");

  function isAuthError(err) {
    if (!err) return false;
    var msg = (err.message || err.toString || "").toString();
    return (
      msg.indexOf("403") !== -1 ||
      msg.indexOf("Forbidden") !== -1 ||
      err.status === 403 ||
      err.statusCode === 403
    );
  }

  function initAuth() {
    if (typeof puter === "undefined" || !puter.auth) {
      setTimeout(initAuth, 50);
      return;
    }
    if (puter.auth.isSignedIn()) {
      loadDir();
    } else {
      contentEl.innerHTML =
        '<div class="empty-state">Sign in with Puter in another tab or window to use your cloud drive here.</div>';
      renderBreadcrumb();
    }
  }

  function showError(message) {
    const el = document.createElement("div");
    el.className = "error-toast";
    el.setAttribute("aria-live", "polite");
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3000);
  }

  function renderBreadcrumb() {
    var parts = currentPath === APP_ROOT ? [] : currentPath.split("/");
    var html = '<a href="#" data-path="' + escapeAttr(APP_ROOT) + '">Home</a>';
    var acc = "";
    parts.forEach(function (name) {
      acc = acc ? acc + "/" + name : name;
      html +=
        ' <span>/</span> <a href="#" data-path="' +
        escapeAttr(acc) +
        '">' +
        escapeHtml(name) +
        "</a>";
    });
    if (parts.length > 0) {
      html +=
        ' <span>/</span> <span class="current">' +
        escapeHtml(parts[parts.length - 1]) +
        "</span>";
    } else {
      html =
        '<a href="#" data-path="' +
        escapeAttr(APP_ROOT) +
        '">Home</a> <span class="current">/</span>';
    }
    breadcrumbEl.innerHTML = html;
    breadcrumbEl.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        currentPath = a.getAttribute("data-path") || APP_ROOT;
        loadDir();
      });
    });
  }

  function escapeAttr(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML.replace(/"/g, "&quot;");
  }
  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatSize(bytes) {
    if (bytes === undefined || bytes === null) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(timestamp) {
    if (timestamp === undefined || timestamp === null) return "—";
    const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    const d = new Date(ms);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }

  function loadDir() {
    contentEl.innerHTML =
      '<div class="loading" aria-live="polite">Loading…</div>';
    renderBreadcrumb();

    puter.fs
      .readdir(currentPath)
      .then(function (items) {
        if (items.length === 0) {
          contentEl.innerHTML =
            '<div class="empty-state">This folder is empty. Create a folder or upload a file.</div>';
          return;
        }
        const ul = document.createElement("ul");
        ul.className = "file-list";
        items.forEach(function (item) {
          const li = document.createElement("li");
          const isDir = item.is_dir === true;
          const iconClass = isDir
            ? "fa-solid fa-folder"
            : "fa-solid fa-file";
          const name =
            item.name ||
            item.path.split("/").filter(Boolean).pop() ||
            item.path;
          li.innerHTML =
            '<span class="icon" aria-hidden="true"><i class="' +
            iconClass +
            '"></i></span>' +
            '<button type="button" class="name" data-path="' +
            escapeAttr(item.path) +
            '" data-isdir="' +
            (isDir ? "1" : "0") +
            '">' +
            escapeHtml(name) +
            "</button>" +
            '<span class="meta">' +
            (item.size !== undefined ? formatSize(item.size) : "—") +
            " · " +
            formatDate(item.created) +
            "</span>" +
            '<div class="actions">' +
            (isDir
              ? ""
              : '<button type="button" class="open" aria-label="Open file"><i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i></button>') +
            '<button type="button" class="rename" aria-label="Rename"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>' +
            '<button type="button" class="move" aria-label="Move"><i class="fa-solid fa-arrows-up-down-left-right" aria-hidden="true"></i></button>' +
            '<button type="button" class="delete" aria-label="Delete"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' +
            "</div>";
          ul.appendChild(li);
        });
        contentEl.innerHTML = "";
        contentEl.appendChild(ul);

        ul.querySelectorAll(".name").forEach(function (el) {
          el.addEventListener("click", function () {
            const path = this.getAttribute("data-path");
            const isDir = this.getAttribute("data-isdir") === "1";
            if (isDir) {
              currentPath = path.replace(/\/$/, "") || APP_ROOT;
              loadDir();
            } else {
              openFile(path);
            }
          });
        });
        ul.querySelectorAll("button.open").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector(".name")
              .getAttribute("data-path");
            openFile(path);
          });
        });
        ul.querySelectorAll("button.rename").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector(".name")
              .getAttribute("data-path");
            renameItem(path);
          });
        });
        ul.querySelectorAll("button.move").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector(".name")
              .getAttribute("data-path");
            moveItem(path);
          });
        });
        ul.querySelectorAll("button.delete").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector(".name")
              .getAttribute("data-path");
            confirmDelete(path);
          });
        });
      })
      .catch(function (err) {
        if (isAuthError(err)) {
          contentEl.innerHTML =
            '<div class="empty-state">Sign in with Puter to access this folder.</div>';
          showError("Please sign in to continue");
        } else {
          contentEl.innerHTML =
            '<div class="empty-state">Could not load folder. ' +
            escapeHtml(String(err && err.message ? err.message : err)) +
            "</div>";
          showError("Could not load folder");
        }
      });
  }

  function openFile(path) {
    modalTitle.textContent = path.split("/").filter(Boolean).pop() || path;
    modalBody.innerHTML =
      '<div class="loading" aria-live="polite">Loading…</div>';
    modalFooter.innerHTML = "";
    modalOverlay.classList.remove("hidden");

    puter.fs
      .stat(path)
      .then(function (stat) {
        const name = (stat.name || path).toLowerCase();
        const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name);
        return puter.fs.read(path).then(function (blob) {
          if (isImage) {
            const url = URL.createObjectURL(blob);
            modalBody.innerHTML =
              '<img class="preview-image" src="' + url + '" alt="Preview">';
            modalOverlay.addEventListener(
              "modal-close-cleanup",
              function cleanup() {
                URL.revokeObjectURL(url);
                modalOverlay.removeEventListener(
                  "modal-close-cleanup",
                  cleanup,
                );
              },
              { once: true },
            );
          } else if (/\.(txt|md|json|js|css|html|log)$/i.test(name)) {
            blob.text().then(function (text) {
              modalBody.innerHTML =
                '<pre class="preview-text">' + escapeHtml(text) + "</pre>";
            });
          } else {
            modalBody.innerHTML =
              "<p>Preview not available. File: " +
              escapeHtml(name) +
              " (" +
              formatSize(stat.size) +
              ")</p>";
          }
        });
      })
      .catch(function (err) {
        modalBody.innerHTML =
          "<p>Could not open file. " +
          escapeHtml(String(err && err.message ? err.message : err)) +
          "</p>";
        showError("Could not open file");
      });
  }

  function confirmDelete(path) {
    const name = path.split("/").filter(Boolean).pop() || path;
    modalTitle.textContent = "Delete?";
    modalBody.innerHTML =
      "<p>Delete <strong>" +
      escapeHtml(name) +
      "</strong>? This cannot be undone.</p>";
    modalFooter.innerHTML =
      '<button type="button" class="btn" id="modal-cancel"><i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Cancel</span></button><button type="button" class="btn btn-danger" id="modal-confirm-delete"><i class="fa-solid fa-trash" aria-hidden="true"></i><span>Delete</span></button>';
    modalOverlay.classList.remove("hidden");

    document
      .getElementById("modal-cancel")
      .addEventListener("click", closeModal);
    document
      .getElementById("modal-confirm-delete")
      .addEventListener("click", function () {
        puter.fs
          .delete(path)
          .then(function () {
            closeModal();
            loadDir();
          })
          .catch(function (err) {
            showError("Delete failed");
            closeModal();
          });
      });
  }

  function renameItem(path) {
    const name = path.split("/").filter(Boolean).pop() || path;
    const newName = prompt("Rename to:", name);
    if (newName === null || newName.trim() === "") return;
    const parent = path.split("/").slice(0, -1).join("/") || APP_ROOT;
    const newPath =
      parent === APP_ROOT ? newName.trim() : parent + "/" + newName.trim();

    puter.fs
      .rename(path, newPath)
      .then(function () {
        loadDir();
      })
      .catch(function (err) {
        showError("Rename failed");
      });
  }

  function moveItem(path) {
    const destPath = prompt("Move to directory (e.g. . or folder):", APP_ROOT);
    if (destPath === null) return;
    const dest = destPath.trim() || APP_ROOT;
    puter.fs
      .move(path, dest)
      .then(function () {
        loadDir();
      })
      .catch(function (err) {
        showError("Move failed");
      });
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
    modalOverlay.dispatchEvent(new Event("modal-close-cleanup"));
  }

  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  document
    .getElementById("btn-new-folder")
    .addEventListener("click", function () {
      const name = prompt("Folder name:");
      if (name === null || name.trim() === "") return;
      const fullPath =
        currentPath === APP_ROOT
          ? name.trim()
          : currentPath + "/" + name.trim();
      puter.fs
        .mkdir(fullPath)
        .then(function () {
          loadDir();
        })
        .catch(function (err) {
          if (isAuthError(err)) {
            contentEl.innerHTML =
              '<div class="empty-state">Sign in with Puter to create folders.</div>';
            showError("Please sign in to continue");
          } else {
            showError("Could not create folder");
          }
        });
    });

  document.getElementById("btn-upload").addEventListener("click", function () {
    uploadInput.click();
  });
  uploadInput.addEventListener("change", function () {
    if (!uploadInput.files || uploadInput.files.length === 0) return;
    const dirPath = currentPath === APP_ROOT ? APP_ROOT : currentPath;
    puter.fs
      .upload(uploadInput.files, dirPath)
      .then(function () {
        uploadInput.value = "";
        loadDir();
      })
      .catch(function (err) {
if (isAuthError(err)) {
            contentEl.innerHTML =
              '<div class="empty-state">Sign in with Puter to upload files.</div>';
            showError("Please sign in to continue");
          } else {
            showError("Upload failed");
          }
        uploadInput.value = "";
      });
  });

  initAuth();
})();
