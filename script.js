// ----- Получение ссылок на все необходимые DOM-элементы -----
const pickDirBtn = document.getElementById('pickDirBtn'); // Кнопка выбора папки
const dirNameEl = document.getElementById('dirName'); // Элемент для отображения имени папки
const renameBtn = document.getElementById('renameBtn'); // Кнопка запуска переименования
const fileListEl = document.getElementById('fileList'); // Контейнер для списка файлов
const msgEl = document.getElementById('msg'); // Элемент для вывода сообщений
const sepEl = document.getElementById('sep'); // Выбор разделителя
const randMinEl = document.getElementById('randMin'); // Мин. длина случайной строки
const randMaxEl = document.getElementById('randMax'); // Макс. длина случайной строки
const charsetEl = document.getElementById('charset'); // Выбор набора символов
const barEl = document.getElementById('bar'); // Полоса прогресс-бара
const use24El = document.getElementById('use24'); // Чекбокс 24-часового формата
const leadingZerosEl = document.getElementById('previewLeadingZeros'); // Чекбокс для ведущих нулей
const addDateEl = document.getElementById('addDate'); // Чекбокс для добавления даты
const addTimeEl = document.getElementById('addTime'); // Чекбокс для добавления времени

// Новые элементы
const addPrefixEl = document.getElementById('addPrefix'); // Чекбокс "добавить префикс"
const prefixEl = document.getElementById('prefix'); // Поле для ввода префикса
const addSuffixEl = document.getElementById('addSuffix'); // Чекбокс "добавить суффикс"
const suffixEl = document.getElementById('suffix'); // Поле для ввода суффикса
const addSeqNumEl = document.getElementById('addSeqNum'); // Чекбокс "добавить порядковый номер"
const seqNumPosEl = document.getElementById('seqNumPos'); // Выбор позиции номера (старт/конец)
const seqNumPadEl = document.getElementById('seqNumPad'); // Поле для паддинга номера
const addRandomCharEl = document.getElementById('addRandomChar'); // Чекбокс "добавить случайный символ"
const randomCharSetEl = document.getElementById('randomCharSet'); // Поле с набором случайных символов

// Элементы модального окна
const modalEl = document.getElementById('customModal'); // Оверлей модального окна
const modalBodyEl = document.getElementById('modalBody'); // Тело модального окна (для текста)
const modalOkBtn = document.getElementById('modalOk'); // Кнопка OK в модальном окне
const modalCancelBtn = document.getElementById('modalCancel'); // Кнопка Отмена в модальном окне

// ----- Глобальные переменные -----
let dirHandle = null; // Хранит хэндл (ссылку) на выбранную директорию
let filesInDir = []; // Массив объектов, представляющих файлы в папке {name, handle}
let supportsFileSystem = 'showDirectoryPicker' in window; // Проверка поддержки File System Access API

// Проверяем, поддерживает ли браузер нужный API
if(!supportsFileSystem){
  dirNameEl.innerHTML = '<span class="danger">Твой браузер не поддерживает File System Access API. Используй Chrome/Edge/Brave (последние версии).</span>';
  pickDirBtn.disabled = true; // Отключаем кнопку выбора папки
}

// --- Назначение обработчиков событий для активации/деактивации полей ---
addPrefixEl.addEventListener('change', () => { prefixEl.disabled = !addPrefixEl.checked; }); // Вкл/выкл поле префикса
addSuffixEl.addEventListener('change', () => { suffixEl.disabled = !addSuffixEl.checked; }); // Вкл/выкл поле суффикса
addSeqNumEl.addEventListener('change', () => { // Вкл/выкл поля, связанные с порядковым номером
  seqNumPosEl.disabled = !addSeqNumEl.checked;
  seqNumPadEl.disabled = !addSeqNumEl.checked;
});
addRandomCharEl.addEventListener('change', () => { randomCharSetEl.disabled = !addRandomCharEl.checked; }); // Вкл/выкл поле набора случайных символов


/**
 * Асинхронно сканирует выбранную директорию на наличие файлов.
 */
async function scanDirectory() {
    if (!dirHandle) return; // Если папка не выбрана, выходим
    filesInDir = []; // Очищаем предыдущий список файлов
    fileListEl.innerHTML = ''; // Очищаем отображение списка
    msgEl.textContent = 'Сканирование...'; // Показываем сообщение о статусе

    // Итерируемся по всем записям в директории
    for await (const [name, handle] of dirHandle.entries()) {
        // Нас интересуют только файлы
        if (handle.kind === 'file') {
            filesInDir.push({ name, handle }); // Добавляем файл в массив
        }
    }
    
    // Если файлы не найдены
    if (filesInDir.length === 0) {
        fileListEl.textContent = 'Файлов не найдено.';
        msgEl.textContent = 'Папка пуста (файлы не найдены).';
        renameBtn.disabled = true; // Отключаем кнопку переименования
        return;
    }
    
    // Если файлы найдены
    msgEl.textContent = `Найдено ${filesInDir.length} файлов.`; // Показываем количество
    renameBtn.disabled = false; // Включаем кнопку переименования
    updatePreview(); // Обновляем предпросмотр
}

  /**
   * Обновляет предпросмотр списка файлов, показывая старые и новые имена.
   */
  function updatePreview() {
    // Если файлов нет, показываем сообщение
    if (filesInDir.length === 0) {
        fileListEl.textContent = 'Файлов не найдено.';
        return;
    }

    // Собираем все текущие настройки в один объект для удобства
         const options = {
             separator: sepEl.value,
             minLen: parseInt(randMinEl.value) || 8,
             maxLen: parseInt(randMaxEl.value) || 12,
             charset: charsetEl.value,
             use24: use24El.checked,
             leadingZeros: leadingZerosEl.checked,
             addDate: addDateEl.checked,
             addTime: addTimeEl.checked,
             addPrefix: addPrefixEl.checked,
             prefix: prefixEl.value,
             addSuffix: addSuffixEl.checked,
             suffix: suffixEl.value,
             addSeqNum: addSeqNumEl.checked,
             seqNumPos: seqNumPosEl.value,
             seqNumPad: parseInt(seqNumPadEl.value) || 3,
             addRandomChar: addRandomCharEl.checked,
             randomCharSet: randomCharSetEl.value
         };
    
         // Создаем три колонки для имен, стрелок и новых имен
    const oldNamesCol = document.createElement('div');
    const arrowCol = document.createElement('div');
    const newNamesCol = document.createElement('div');
    
    // Для каждого файла генерируем новое имя и добавляем в соответствующие колонки
    filesInDir.forEach((file, index) => {
        const oldName = file.name;
        const lastDot = oldName.lastIndexOf('.');
        const ext = (lastDot > 0) ? oldName.slice(lastDot) : ''; // Извлекаем расширение
        const newBaseName = generateName(options, index + 1); // Генерируем новое имя без расширения
        const newName = newBaseName + ext; // Добавляем расширение

        // Создаем и добавляем div для старого имени
        const oldNameDiv = document.createElement('div');
        oldNameDiv.textContent = oldName;
        oldNameDiv.title = oldName; // title для всплывающей подсказки, если имя обрезано
        oldNamesCol.appendChild(oldNameDiv);

        // Создаем и добавляем div для стрелки
        const arrowDiv = document.createElement('div');
        arrowDiv.textContent = '→';
        arrowCol.appendChild(arrowDiv);

        // Создаем и добавляем div для нового имени
        const newNameDiv = document.createElement('div');
        newNameDiv.innerHTML = `<strong>${escapeHtml(newName)}</strong>`; // Используем innerHTML для жирного шрифта
        newNameDiv.title = newName;
        newNamesCol.appendChild(newNameDiv);
    });

    // Очищаем контейнер и добавляем в него новые колонки
    fileListEl.innerHTML = '';
    fileListEl.appendChild(oldNamesCol);
    fileListEl.appendChild(arrowCol);
    fileListEl.appendChild(newNamesCol);
}


/**
 * Обработчик клика по кнопке выбора папки.
 */
pickDirBtn.addEventListener('click', async () => {
  try {
    // Показываем стандартный диалог выбора директории
    dirHandle = await window.showDirectoryPicker();
    dirNameEl.textContent = dirHandle.name || 'Выбрана папка'; // Отображаем имя папки
    msgEl.textContent = 'Папка выбрана, сканирую файлы...';
    fileListEl.textContent = '—'; // Сбрасываем список файлов
    renameBtn.disabled = true; // Отключаем кнопку на время сканирования
    await scanDirectory(); // Запускаем автоматическое сканирование
  } catch (e) {
    console.error(e); // Логируем ошибку, если пользователь отменил выбор
    msgEl.textContent = 'Папка не выбрана или доступ запрещён.';
  }
});

/**
 * Экранирует HTML-символы для безопасного вывода.
 * @param {string} s - Исходная строка.
 * @returns {string} - Экранированная строка.
 */
function escapeHtml(s){
  return s.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');
}

/**
 * Генерирует случайное целое число в заданном диапазоне.
 * @param {number} min - Минимальное значение.
 * @param {number} max - Максимальное значение.
 * @returns {number} - Случайное число.
 */
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

/**
 * Создает случайную строку заданной длины из указанного набора символов.
 * @param {number} len - Длина строки.
 * @param {string} charset - Название набора символов ('alnum', 'hex', и т.д.).
 * @returns {string} - Сгенерированная строка.
 */
function makeRandomString(len, charset){
  let chars = '';
  if(charset === 'alnum'){
    chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  } else if(charset === 'alnum_sym'){
    chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  } else if(charset === 'hex'){
    chars = '0123456789abcdef';
  } else if(charset === 'digits'){
    chars = '0123456789';
  } else chars = 'abcdefghijklmnopqrstuvwxyz0123456789'; // По умолчанию
  let out = '';
  for(let i=0;i<len;i++) out += chars.charAt(Math.floor(Math.random()*chars.length));
  return out;
}

/**
 * Дополняет число ведущим нулем, если оно меньше 10.
 * @param {number} n - Число.
 * @returns {string} - Отформатированная строка.
 */
function pad(n){ return n<10 ? '0'+n : String(n); }

/**
 * Создает объект с компонентами текущей даты и времени.
 * @param {boolean} use24 - Использовать 24-часовой формат.
 * @param {boolean} leadingZeros - Добавлять ведущие нули.
 * @returns {object} - Объект вида {month, day, hour, minute}.
 */
function makeTimestamp(use24=true, leadingZeros=true){
  const d = new Date();
  let month = d.getMonth()+1;
  let day = d.getDate();
  let hour = d.getHours();
  let minute = d.getMinutes();
  
  // 12-часовой формат здесь не реализован, т.к. не требуется по ТЗ
  if(!use24){
    // если не 24ч — оставляем как есть (AM/PM не нужен, всё равно числовой)
  }
  
  // Добавляем ведущие нули при необходимости
  if(leadingZeros){
    month = pad(month); day = pad(day); hour = pad(hour); minute = pad(minute);
  } else {
    month = String(month); day = String(day); hour = String(hour); minute = String(minute);
  }
  return {month, day, hour, minute};
}

/**
 * Основная функция генерации нового имени файла на основе настроек.
 * @param {object} options - Объект с настройками.
 * @param {number} seqNum - Текущий порядковый номер для этого файла.
 * @returns {string} - Сгенерированное базовое имя (без расширения).
 */
function generateName(options, seqNum = 1) {
  // Деструктуризация объекта опций для удобства
  const {
      separator, minLen, maxLen, charset, use24, leadingZeros, addDate, addTime,
      addPrefix, prefix, addSuffix, suffix, addSeqNum, seqNumPos, seqNumPad, addRandomChar, randomCharSet
  } = options;

  // Создаем временную метку, если нужно
  const ts = (addDate || addTime) ? makeTimestamp(use24, leadingZeros) : null;
  // Определяем длину случайной строки
  const len = randInt(Math.min(minLen, maxLen), Math.max(minLen, maxLen));
  // Генерируем саму случайную строку
  const r = makeRandomString(len, charset);
  
  // Собираем случайную часть имени
  let randomPart = r;
  // Если нужно, добавляем случайный символ в случайную часть
  if (addRandomChar && randomCharSet.length > 0) {
      const randomSymbols = randomCharSet.split(''); // Получаем массив символов
      const randomSymbol = randomSymbols[Math.floor(Math.random() * randomSymbols.length)]; // Выбираем один
      const pos = randInt(0, randomPart.length); // Выбираем позицию для вставки
      randomPart = randomPart.slice(0, pos) + randomSymbol + randomPart.slice(pos); // Вставляем
  }
  
  // Собираем базовое имя
  let baseName = '';
  if (addDate && addTime) {
      // Собираем базовое имя из даты, времени и случайной части
      baseName = `${ts.month}${separator}${ts.day}${separator}${ts.hour}${separator}${ts.minute}${separator}${randomPart}`;
  } else if (addDate) {
      // Только дата и случайная часть
      baseName = `${ts.month}${separator}${ts.day}${separator}${randomPart}`;
  } else if (addTime) {
      // Только время и случайная часть
      baseName = `${ts.hour}${separator}${ts.minute}${separator}${randomPart}`;
  } else {
      // Только случайная часть
      baseName = randomPart;
  }

 // Добавляем префикс, если нужно
  if (addPrefix && prefix) {
      baseName = prefix + baseName;
  }

  // Добавляем суффикс, если нужно
  if (addSuffix && suffix) {
      baseName = baseName + suffix;
  }

  // Добавляем порядковый номер, если нужно
  if (addSeqNum) {
      const padSize = seqNumPad > 0 ? seqNumPad : 3; // Размер паддинга
      const seqStr = String(seqNum).padStart(padSize, '0'); // Форматируем номер
      if (seqNumPos === 'start') {
          baseName = `${seqStr}${separator}${baseName}`; // В начало
      } else {
          baseName = `${baseName}${separator}${seqStr}`; // В конец
      }
  }

 return baseName; // Возвращаем готовое имя
}

// Назначаем единый обработчик 'input' на все элементы управления для обновления предпросмотра
[sepEl, randMinEl, randMaxEl, charsetEl, use24El, leadingZerosEl, addDateEl, addTimeEl, addPrefixEl, prefixEl, addSuffixEl, suffixEl, addSeqNumEl, seqNumPosEl, seqNumPadEl, addRandomCharEl, randomCharSetEl].forEach(el => {
  el.addEventListener('input', updatePreview);
});

// ==== Основная логика переименования ====
renameBtn.addEventListener('click', async () => {
  // Проверка, есть ли файлы для переименования
  if(!dirHandle || filesInDir.length === 0) {
      await showModal('Нет файлов для переименования.'); // Показываем кастомное уведомление
      return;
  }
  // Запрашиваем подтверждение через кастомное модальное окно
  const confirmed = await showModal(`Будут переименованы ${filesInDir.length} файлов в выбранной папке. Продолжить?`);
  if (!confirmed) return; // Если пользователь нажал "Отмена", выходим

  // Блокируем кнопки на время операции
  renameBtn.disabled = true;
  pickDirBtn.disabled = true;
  msgEl.textContent = 'Выполняется переименование...';
  barEl.style.width = '0%'; // Сбрасываем прогресс-бар
  
  const total = filesInDir.length; // Общее количество файлов
  let done = 0; // Счетчик обработанных файлов
  
  // Собираем все настройки в один объект
    const options = {
        separator: sepEl.value,
        minLen: parseInt(randMinEl.value) || 8,
        maxLen: parseInt(randMaxEl.value) || 12,
        charset: charsetEl.value,
        use24: use24El.checked,
        leadingZeros: leadingZerosEl.checked,
        addDate: addDateEl.checked,
        addTime: addTimeEl.checked,
        addPrefix: addPrefixEl.checked,
        prefix: prefixEl.value,
        addSuffix: addSuffixEl.checked,
        suffix: suffixEl.value,
        addSeqNum: addSeqNumEl.checked,
        seqNumPos: seqNumPosEl.value,
        seqNumPad: parseInt(seqNumPadEl.value) || 3,
        addRandomChar: addRandomCharEl.checked,
        randomCharSet: randomCharSetEl.value
   };

  const log = []; // Массив для записи лога изменений
  let currentSeq = 1; // Начальный порядковый номер

  // Основной цикл переименования
  for(const fileObj of filesInDir){
    try {
      const oldName = fileObj.name;
      const lastDot = oldName.lastIndexOf('.');
      const ext = (lastDot > 0) ? oldName.slice(lastDot) : ''; // Извлекаем расширение
      
      let baseNew = generateName(options, currentSeq); // Генерируем новое имя
      let candidate = baseNew + ext; // Добавляем расширение
      let suffixNum = 1; // Суффикс для разрешения конфликтов имен
      
      // Проверяем, не занято ли новое имя. Если да, добавляем числовой суффикс (_1, _2...)
      while(true){
        let exists = false;
        try {
          await dirHandle.getFileHandle(candidate); // Пытаемся получить хэндл файла
          exists = true; // Если успешно, значит файл существует
        } catch(e){
          exists = false; // Если ошибка - файла нет
        }
        if(!exists) break; // Если имя свободно, выходим из цикла
        candidate = `${baseNew}_${suffixNum}${ext}`; // Иначе добавляем суффикс и пробуем снова
        suffixNum++;
      }

      // --- Процесс копирования и удаления ---
      const oldHandle = fileObj.handle; // Хэндл старого файла
      const oldFile = await oldHandle.getFile(); // Получаем сам файл
      const data = await oldFile.arrayBuffer(); // Читаем его содержимое в ArrayBuffer

      // Создаем новый файл с новым именем
      const newHandle = await dirHandle.getFileHandle(candidate, { create: true });
      const writable = await newHandle.createWritable(); // Получаем WritableStream
      await writable.write(data); // Записываем данные
      await writable.close(); // Закрываем стрим, завершая запись

      // Удаляем старый файл
      try {
        await dirHandle.removeEntry(oldName);
      } catch(e) {
        console.warn('Не удалось удалить старый файл (возможно недостаточно прав):', e);
      }

      log.push({old: oldName, newName: candidate, ok: true}); // Записываем успех в лог
    } catch(err) {
      console.error('Ошибка при обработке', fileObj.name, err);
      log.push({old: fileObj.name, newName: null, ok: false, error: String(err)}); // Записываем ошибку в лог
    }

    done++; // Увеличиваем счетчик
    currentSeq++; // Увеличиваем порядковый номер
    barEl.style.width = Math.round(done / total * 100) + '%'; // Обновляем прогресс-бар
    await new Promise(r => setTimeout(r, 10)); // Небольшая пауза для визуального эффекта
  }

  // --- Вывод результата ---
  let html = `<div><strong>Результат:</strong></div><ul>`;
  for(const item of log){
    if(item.ok) html += `<li>${escapeHtml(item.old)} → ${escapeHtml(item.newName)}</li>`;
    else html += `<li class="danger">${escapeHtml(item.old)} — ошибка: ${escapeHtml(item.error)}</li>`;
  }
  html += `</ul>`;
  document.getElementById('result').innerHTML = html; // Отображаем лог
  
  // Завершение
  msgEl.textContent = 'Готово.';
  renameBtn.disabled = false; // Разблокируем кнопки
  pickDirBtn.disabled = false;
  
  // Обновляем список файлов в UI, чтобы показать новые имена
  await scanDirectory();
});

// --- Логика модального окна ---
let modalResolve = null; // Переменная для хранения resolve функции промиса

/**
 * Показывает кастомное модальное окно.
 * @param {string} message - Сообщение для отображения.
 * @returns {Promise<boolean>} - Промис, который разрешается в `true` (OK) или `false` (Отмена).
 */
function showModal(message) {
  modalBodyEl.textContent = message; // Устанавливаем текст
  modalEl.style.display = 'flex'; // Показываем окно
  // Возвращаем промис, который будет ждать решения пользователя
  return new Promise((resolve) => {
    modalResolve = resolve;
  });
}

// Обработчик для кнопки OK
modalOkBtn.addEventListener('click', () => {
  modalEl.style.display = 'none'; // Скрываем окно
  if (modalResolve) modalResolve(true); // Разрешаем промис со значением true
});

// Обработчик для кнопки Отмена
modalCancelBtn.addEventListener('click', () => {
  modalEl.style.display = 'none'; // Скрываем окно
  if (modalResolve) modalResolve(false); // Разрешаем промис со значением false
});

// При первоначальной загрузке страницы обновляем предпросмотр (покажет "Файлов не найдено")
updatePreview();
