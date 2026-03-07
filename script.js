(function () {
  const ROOT_PATH = ".";
  let currentDirectoryPath = ROOT_PATH;
  const contentEl = document.getElementById("content");
  const breadcrumbEl = document.getElementById("breadcrumb");
  const modalDialog = document.getElementById("app-dialog");
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

  function initializeTwDrive() {
    if (typeof puter === "undefined" || !puter.auth) {
      setTimeout(initializeTwDrive, 50);
      return;
    }
    if (puter.auth.isSignedIn()) {
      loadCurrentDirectory();
    } else {
      contentEl.innerHTML =
        '<div class="empty-state">Sign in with Puter in another tab or window to use TW Drive here.</div>';
      renderBreadcrumbTrail();
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

  function renderBreadcrumbTrail() {
    var parts =
      currentDirectoryPath === ROOT_PATH ? [] : currentDirectoryPath.split("/");
    var html = '<a href="#" data-path="' + escapeAttr(ROOT_PATH) + '">Home</a>';
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
        escapeAttr(ROOT_PATH) +
        '">Home</a> <span class="current">/</span>';
    }
    breadcrumbEl.innerHTML = html;
    breadcrumbEl.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        currentDirectoryPath = a.getAttribute("data-path") || ROOT_PATH;
        loadCurrentDirectory();
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

  function isBlobLike(value) {
    return typeof Blob !== "undefined" && value instanceof Blob;
  }

  function toTextContent(value) {
    if (typeof value === "string") return Promise.resolve(value);
    if (isBlobLike(value)) return value.text();
    return Promise.resolve(String(value || ""));
  }

  function createImagePreviewUrl(fileData, name) {
    const isSvg = /\.svg$/i.test(name);
    if (isSvg) {
      return toTextContent(fileData).then(function (text) {
        return URL.createObjectURL(
          new Blob([text], { type: "image/svg+xml;charset=utf-8" }),
        );
      });
    }

    if (isBlobLike(fileData)) {
      return Promise.resolve(URL.createObjectURL(fileData));
    }

    return Promise.resolve(
      URL.createObjectURL(new Blob([fileData], { type: "application/octet-stream" })),
    );
  }

  function loadCurrentDirectory() {
    contentEl.innerHTML =
      '<div class="loading" aria-live="polite">Loading…</div>';
    renderBreadcrumbTrail();

    puter.fs
      .readdir(currentDirectoryPath)
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
              currentDirectoryPath = path.replace(/\/$/, "") || ROOT_PATH;
              loadCurrentDirectory();
            } else {
              openFilePreview(path);
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
            openFilePreview(path);
          });
        });
        ul.querySelectorAll("button.rename").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector(".name")
              .getAttribute("data-path");
            openRenameDialog(path);
          });
        });
        ul.querySelectorAll("button.move").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector(".name")
              .getAttribute("data-path");
            openMoveDialog(path);
          });
        });
        ul.querySelectorAll("button.delete").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector(".name")
              .getAttribute("data-path");
            openDeleteDialog(path);
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

  function openFilePreview(path) {
    modalTitle.textContent = path.split("/").filter(Boolean).pop() || path;
    modalBody.innerHTML =
      '<div class="loading" aria-live="polite">Loading…</div>';
    modalFooter.innerHTML = "";
    modalDialog.showModal();

    puter.fs
      .stat(path)
      .then(function (stat) {
        const name = (stat.name || path).toLowerCase();
        const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name);
        return puter.fs.read(path).then(function (fileData) {
          if (isImage) {
            return createImagePreviewUrl(fileData, name).then(function (url) {
              modalBody.innerHTML =
                '<img class="preview-image" src="' + url + '" alt="Preview">';
              modalDialog.addEventListener(
                "modal-close-cleanup",
                function cleanup() {
                  URL.revokeObjectURL(url);
                  modalDialog.removeEventListener(
                    "modal-close-cleanup",
                    cleanup,
                  );
                },
                { once: true },
              );
            });
          } else if (/\.(txt|md|json|js|css|html|log)$/i.test(name)) {
            toTextContent(fileData).then(function (text) {
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

  function openDeleteDialog(path) {
    const name = path.split("/").filter(Boolean).pop() || path;
    modalTitle.textContent = "Delete?";
    modalBody.innerHTML =
      "<p>Delete <strong>" +
      escapeHtml(name) +
      "</strong>? This cannot be undone.</p>";
    modalFooter.innerHTML =
      '<button type="button" class="btn" id="modal-cancel"><i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Cancel</span></button><button type="button" class="btn btn-danger" id="modal-confirm-delete" data-path="' +
      escapeAttr(path) +
      '"><i class="fa-solid fa-trash" aria-hidden="true"></i><span>Delete</span></button>';
    modalDialog.showModal();
  }

  function openActionDialog(options) {
    const dialogTitles = {
      rename: "Rename",
      move: "Move to",
      newFolder: "New folder",
    };
    const fieldLabels = {
      rename: "New name",
      move: "Directory path",
      newFolder: "Folder name",
    };
    const fieldPlaceholders = {
      rename: "",
      move: ". or folder name",
      newFolder: "Folder name",
    };
    const primaryButtonLabels = {
      rename: "Rename",
      move: "Move",
      newFolder: "Create",
    };
    const actionType = options.type;
    const value = options.value || "";
    modalTitle.textContent = dialogTitles[actionType];
    modalBody.innerHTML =
      '<label for="modal-input" class="modal-form-label">' +
      escapeHtml(fieldLabels[actionType]) +
      "</label>" +
      '<input type="text" id="modal-input" class="modal-form-input" value="' +
      escapeAttr(value) +
      '" placeholder="' +
      escapeAttr(fieldPlaceholders[actionType]) +
      '" autocomplete="off"' +
      (options.path ? ' data-path="' + escapeAttr(options.path) + '"' : "") +
      ">";
    modalFooter.innerHTML =
      '<button type="button" class="btn" id="modal-cancel"><i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Cancel</span></button>' +
      '<button type="button" class="btn btn-primary" id="modal-confirm"><i class="fa-solid fa-check" aria-hidden="true"></i><span>' +
      primaryButtonLabels[actionType] +
      "</span></button>";
    modalDialog.showModal();

    const inputEl = document.getElementById("modal-input");
    inputEl.focus();
    inputEl.select();
  }

  function openRenameDialog(path) {
    const name = path.split("/").filter(Boolean).pop() || path;
    openActionDialog({ type: "rename", path: path, value: name });
  }

  function openMoveDialog(path) {
    openActionDialog({
      type: "move",
      path: path,
      value: ROOT_PATH,
      currentDirectoryPath: currentDirectoryPath,
    });
  }

  function closeModal() {
    if (modalDialog.open) {
      modalDialog.close();
    }
    modalDialog.dispatchEvent(new Event("modal-close-cleanup"));
  }

  modalFooter.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.id;
    if (id === "modal-cancel") {
      closeModal();
    } else if (id === "modal-confirm") {
      const inputEl = document.getElementById("modal-input");
      if (!inputEl) return;
      const val = inputEl.value.trim();
      if (!val) {
        showError("Please enter a value");
        return;
      }
      const title = modalTitle.textContent;
      if (title === "Rename") {
        const path = inputEl.dataset.path;
        puter.fs.rename(path, val).then(function () {
          closeModal();
          loadCurrentDirectory();
        }).catch(function (err) {
          showError("Rename failed");
        });
      } else if (title === "Move to") {
        const path = inputEl.dataset.path;
        puter.fs.move(path, val).then(function () {
          closeModal();
          loadCurrentDirectory();
        }).catch(function (err) {
          showError("Move failed");
        });
      } else if (title === "New folder") {
        const fullPath =
          currentDirectoryPath === ROOT_PATH
            ? val
            : currentDirectoryPath + "/" + val;
        puter.fs.mkdir(fullPath).then(function () {
          closeModal();
          loadCurrentDirectory();
        }).catch(function (err) {
          showError("Failed to create folder");
        });
      }
    } else if (id === "modal-confirm-delete") {
      const path = btn.dataset.path;
      puter.fs.delete(path).then(function () {
        closeModal();
        loadCurrentDirectory();
      }).catch(function (err) {
        showError("Delete failed");
        closeModal();
      });
    }
  });

  modalBody.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      const btn = document.getElementById("modal-confirm");
      if (btn) btn.click();
    }
  });

  modalClose.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });
  modalDialog.addEventListener("click", function (e) {
    if (e.target === modalDialog) closeModal();
  });
  modalDialog.addEventListener("cancel", function (e) {
    e.preventDefault();
    closeModal();
  });
  modalDialog.addEventListener("close", function () {
    modalDialog.dispatchEvent(new Event("modal-close-cleanup"));
  });

  document
    .getElementById("btn-new-folder")
    .addEventListener("click", function () {
      openActionDialog({
        type: "newFolder",
        currentDirectoryPath: currentDirectoryPath,
        value: "",
      });
    });

  document.getElementById("btn-upload").addEventListener("click", function () {
    uploadInput.click();
  });
  uploadInput.addEventListener("change", function () {
    if (!uploadInput.files || uploadInput.files.length === 0) return;
    const targetDirectoryPath =
      currentDirectoryPath === ROOT_PATH ? ROOT_PATH : currentDirectoryPath;
    puter.fs
      .upload(uploadInput.files, targetDirectoryPath)
      .then(function () {
        uploadInput.value = "";
        loadCurrentDirectory();
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

  initializeTwDrive();
})();
