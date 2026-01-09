import { calculateNextOccurrence, padNumber, formatMonthDay } from './utils.js';

export const BOSS_THRESHOLDS = {
    IMMINENT: 5 * 60 * 1000,    // 5 minutes
    WARNING: 10 * 60 * 1000,    // 10 minutes
    MEDIUM: 60 * 60 * 1000      // 1 hour
};

export const BossDataManager = (() => {
    // LocalStorage Key
    const STORAGE_KEY = 'bossSchedule';
    const DRAFT_STORAGE_KEY = 'bossSchedule_draft';

    /**
     * 초기 로드된 데이터의 유효성을 검사하고 손상된 데이터를 정제합니다.
     */
    const _sanitizeInitData = (items) => {
        if (!items || !Array.isArray(items)) return [];
        return items.filter(item => {
            if (!item || typeof item !== 'object') return false;

            if (item.type === 'date') {
                return !!item.date;
            }

            if (item.type === 'boss') {
                const hasName = !!item.name;
                // scheduledDate가 문자열로 들어올 수도 있으므로 Date 객체로 변환 시도
                const d = item.scheduledDate instanceof Date ? item.scheduledDate : new Date(item.scheduledDate);
                const hasValidDate = !isNaN(d.getTime());

                // ID가 없으면 생성 (영속성 식별을 위해 필요)
                if (hasName && hasValidDate && !item.id) {
                    item.id = `boss-${item.name}-${d.getTime()}`;
                }

                // Date 객체로 확실히 변환하여 저장
                if (hasValidDate) {
                    item.scheduledDate = d;
                }

                return hasName && hasValidDate;
            }
            return false;
        });
    };

    // IIFE 선언 시점에 로컬 스토리지에서 SSOT(Main) 데이터를 즉시 로드 후 정제
    let bossSchedule = (() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved, (key, value) => {
                    if (key === 'scheduledDate') return new Date(value);
                    return value;
                });
                return _sanitizeInitData(parsed);
            } catch (e) {
                console.error('Failed to parse initial bossSchedule', e);
                return [];
            }
        }
        return [];
    })();

    let _draftSchedule = null; // Draft 스케줄 저장용 (임시 SSOT)
    let _nextBoss = null; // 다음 보스 정보를 저장할 변수
    let _minTimeDiff = Infinity; // 다음 보스까지 남은 시간을 저장할 변수
    let _presets = {}; // 보스 프리셋 메타데이터 저장용
    const subscribers = []; // 구독자(콜백 함수) 목록

    const _getInternalBossMetadata = (bossName, contextId) => {
        const getMeta = (val) => {
            if (typeof val === 'number') return { interval: val, isInvasion: false };
            return { interval: val.interval || 0, isInvasion: !!val.isInvasion };
        };

        if (contextId && _presets[contextId] && _presets[contextId].bossMetadata && _presets[contextId].bossMetadata[bossName]) {
            return getMeta(_presets[contextId].bossMetadata[bossName]);
        }
        for (const context of Object.values(_presets)) {
            if (context.bossMetadata && context.bossMetadata[bossName]) {
                return getMeta(context.bossMetadata[bossName]);
            }
        }
        return { interval: 0, isInvasion: false };
    };

    const _getInternalBossInterval = (bossName, contextId) => {
        return _getInternalBossMetadata(bossName, contextId).interval;
    };

    const notify = () => {
        for (const subscriber of subscribers) {
            subscriber();
        }
    };

    /**
     * 보스 아이템 리스트를 48시간 분량(오늘~내일)으로 확장하고 날짜별로 재구성합니다.
     */
    const _expandAndReconstruct = (items) => {
        if (!items || items.length === 0) return [];

        const now = Date.now();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const startTime = todayStart.getTime();
        const endTime = startTime + (48 * 60 * 60 * 1000); // 오늘 00:00 ~ 내일 24:00 (48시간)

        const expandedBosses = [];
        const userDefinedMap = new Map(); // 사용자 정의 인스턴스 저장 (Key: 이름_타임스탬프)

        // 1. 사용자 정의 인스턴스 수집 (텍스트 모드 등에서 넘어온 모든 인스턴스)
        const bossItems = items.filter(item => item.type === 'boss' && item.scheduledDate);
        bossItems.forEach(boss => {
            const t = new Date(boss.scheduledDate).getTime();
            const key = `${boss.name}_${t}`;
            userDefinedMap.set(key, boss);
        });

        const bossNames = [...new Set(bossItems.map(b => b.name))];

        // 2. 각 보스별 확장 로직
        bossNames.forEach(bossName => {
            // 해당 보스의 사용자 정의 데이터 중 interval 정보( @젠시간 )가 있는지 확인 (Bohe 님 우선순위 적용)
            const userDefinedItems = bossItems.filter(b => b.name === bossName);
            const customInterval = userDefinedItems.find(b => b.interval > 0)?.interval;

            // 사용자 정의 값이 있으면 사용, 없으면 프리셋에서 가져옴
            const intervalMinutes = (customInterval !== undefined && customInterval > 0)
                ? customInterval
                : _getInternalBossInterval(bossName);

            const interval = intervalMinutes * 60 * 1000;
            // 해당 보스의 사용자 입력 중 현재와 가장 가까운 것을 기준 앵커로 설정 (자동 확장을 위한 기준)
            const sameBosses = bossItems.filter(b => b.name === bossName)
                .sort((a, b) => Math.abs(new Date(a.scheduledDate).getTime() - now) - Math.abs(new Date(b.scheduledDate).getTime() - now));

            const anchor = sameBosses[0];
            if (!anchor) return;

            const anchorTime = new Date(anchor.scheduledDate).getTime();

            const createInstance = (time) => {
                const key = `${bossName}_${time}`;
                if (userDefinedMap.has(key)) {
                    // 보헤님이 직접 입력한 인스턴스가 있으면 그대로 사용 (UID 유지 및 메모 보존)
                    return { ...userDefinedMap.get(key) };
                } else {
                    // 없으면 새 UID를 가진 인스턴스 생성 (복사가 아닌 새로운 인스턴스)
                    return {
                        ...anchor,
                        id: `boss-${bossName}-${time}`,
                        scheduledDate: new Date(time),
                        time: `${padNumber(new Date(time).getHours())}:${padNumber(new Date(time).getMinutes())}`,
                        memo: anchor.memo || "" // 앵커의 메모를 기본값으로 사용
                    };
                }
            };

            const isSameDay = (d1, d2) => {
                return d1.getFullYear() === d2.getFullYear() &&
                    d1.getMonth() === d2.getMonth() &&
                    d1.getDate() === d2.getDate();
            };

            const meta = _getInternalBossMetadata(bossName);
            const isTodayOnly = meta.isInvasion;


            // [수정] 젠 주기에 상관없이 사용자가 직접 입력한 데이터(앵커) 중 '오늘 00:00 이후' 데이터만 보존
            // (데이터 다이어트 및 과거 흔적 제거)
            sameBosses.forEach(b => {
                const bTime = new Date(b.scheduledDate).getTime();
                if (bTime >= startTime) {
                    expandedBosses.push({ ...b });
                }
            });

            if (interval > 0) {
                // 과거로 확장 (오늘 00:00까지만)
                let t = anchorTime - interval;
                while (t >= startTime) {
                    const inst = createInstance(t);
                    if (!isTodayOnly || isSameDay(inst.scheduledDate, new Date(now))) {
                        expandedBosses.push(inst);
                    }
                    t -= interval;
                }
                // 미래로 확장 (48시간 윈도우 내)
                t = anchorTime + interval;
                let generatedInWindow = false;

                // 앵커가 윈도우 안에 있는지 확인
                if (anchorTime >= startTime && anchorTime <= endTime) {
                    generatedInWindow = true;
                }

                while (t <= endTime) {
                    const inst = createInstance(t);
                    if (!isTodayOnly || isSameDay(inst.scheduledDate, new Date(now))) {
                        expandedBosses.push(inst);
                        generatedInWindow = true;
                    }
                    t += interval;
                }

                // [중요 로직] 윈도우 내에 생성된 것이 하나도 없다면, 가장 가까운 미래 1개를 강제 생성 (Anchor Keeper)
                if (!generatedInWindow) {
                    let futureTime = anchorTime;
                    while (futureTime < endTime) {
                        futureTime += interval;
                    }
                    const hiddenAnchor = createInstance(futureTime);
                    expandedBosses.push(hiddenAnchor);
                }
            }
            // else 블록(1회성 이벤트)은 이미 위에서 sameBosses.forEach로 처리됨
        });

        // 중복 제거 (확장 과정에서 사용자가 입력한 시간과 겹칠 수 있음)
        const finalUniqueItems = [];
        const seenIds = new Set();
        expandedBosses.forEach(boss => {
            if (!seenIds.has(boss.id)) {
                finalUniqueItems.push(boss);
                seenIds.add(boss.id);
            }
        });

        // 3. 시간순 정렬
        finalUniqueItems.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

        const reconstructed = [];
        let lastDateStr = '';
        finalUniqueItems.forEach(boss => {
            const d = boss.scheduledDate;
            const dateStr = `${padNumber(d.getMonth() + 1)}.${padNumber(d.getDate())}`;

            // Reconstruct 시 날짜 헤더 추가 로직
            // 단, 저장 로직에서는 헤더가 굳이 필요 없지만, 호환성을 위해 유지하거나
            // 혹은 UI 렌더링 시에만 필터링하도록 함.
            if (dateStr !== lastDateStr) {
                reconstructed.push({ type: 'date', date: dateStr });
                lastDateStr = dateStr;
            }
            reconstructed.push(boss);
        });

        return reconstructed;
    };

    // Load Draft from LocalStorage helper
    const loadDraft = () => {
        if (!_draftSchedule) {
            const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft, (key, value) => {
                        if (key === 'scheduledDate') return new Date(value);
                        return value;
                    });
                    const sanitized = _sanitizeInitData(parsed);
                    // 정제 후에도 데이터가 유효할 때만 적용
                    if (sanitized && sanitized.length > 0) {
                        _draftSchedule = sanitized;
                    }
                } catch (e) {
                    console.error('Failed to parse draftSchedule', e);
                    _draftSchedule = null;
                }
            }
        }
    };

    return {
        initPresets: (presets) => {
            _presets = presets;

            // 프리셋이 로드되면 기존 스케줄을 즉시 확장 및 정규화
            if (bossSchedule && bossSchedule.length > 0) {
                bossSchedule = _expandAndReconstruct(bossSchedule);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule));

                // Draft도 동기화
                _draftSchedule = JSON.parse(JSON.stringify(bossSchedule), (key, value) => {
                    if (key === 'scheduledDate') return new Date(value);
                    return value;
                });
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(_draftSchedule));
                notify();
            }
        },
        /**
         * 메인 SSOT와 임시 Draft가 다른지(사용자가 수정 중인지) 확인합니다.
         */
        isDraftDirty: () => {
            loadDraft();
            if (!_draftSchedule) return false;

            // 단순 JSON 비교가 아닌, '사용자 입력 필드' 위주로 비교
            // (알림 상태(alerted_*) 변경 등 시스템적인 차이는 무시)
            const simplify = (list) => {
                if (!Array.isArray(list)) return [];
                return list
                    .filter(item => item.type === 'boss') // 날짜 헤더 등 제외
                    .map(item => ({
                        id: item.id,
                        scheduledDate: item.scheduledDate ? item.scheduledDate.getTime() : 0,
                        memo: item.memo || ""
                        // time, name 등은 어차피 id나 scheduledDate에 종속적이거나 불변
                    }))
                    .sort((a, b) => a.id.localeCompare(b.id)); // ID 순 정렬 후 비교
            };

            const mainSimple = JSON.stringify(simplify(bossSchedule));
            const draftSimple = JSON.stringify(simplify(_draftSchedule));

            return mainSimple !== draftSimple;
        },
        /**
         * 임시 Draft를 현재 메인 SSOT의 최신 상태로 강제 동기화합니다.
         */
        syncDraftWithMain: () => {
            _draftSchedule = JSON.parse(JSON.stringify(bossSchedule), (key, value) => {
                if (key === 'scheduledDate') return new Date(value);
                return value;
            });
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(_draftSchedule));
            notify();
        },
        /**
         * 정기적인 업데이트(자정 00:00)가 필요한지 확인하고 수행합니다.
         * @param {boolean} force - 강제 업데이트 여부
         * @param {boolean} isSchedulerActive - 현재 보스 스케줄러 화면이 활성화되어 있는지 여부
         */
        checkAndUpdateSchedule: (force = false, isSchedulerActive = false) => {
            const now = new Date();

            // 업데이트 기준점 설정 (0시 자정)
            const lastUpdate = LocalStorageManager.get('lastAutoUpdateTimestamp');
            const lastUpdateDate = lastUpdate ? new Date(lastUpdate) : null;

            let needsUpdate = force;

            if (!needsUpdate && lastUpdateDate) {
                // 날짜가 바뀌었으면 업데이트 필요 (자정 업데이트)
                const isDifferentDay = now.toDateString() !== lastUpdateDate.toDateString();

                if (isDifferentDay) {
                    needsUpdate = true;
                }
            } else if (!lastUpdateDate) {
                needsUpdate = true; // 최초 실행 시
            }

            if (needsUpdate) {
                const performUpdate = () => {
                    // 1. 메인 SSOT 업데이트 (Reconstruct)
                    bossSchedule = _expandAndReconstruct(bossSchedule);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule));
                    LocalStorageManager.set('lastAutoUpdateTimestamp', now.getTime());

                    // 2. Draft 동기화 로직
                    if (!BossDataManager.isDraftDirty()) {
                        // 수정 사항이 없으면 즉시 동기화 (Step 3)
                        BossDataManager.syncDraftWithMain();
                    } else {
                        // 수정 사항이 있는 경우 (Step 4)
                        // 취소 시에도 원본 SSOT는 이미 위에서 업데이트됨. 
                        // Draft는 그대로 유지되어 사용자의 편집권을 보호함.
                    }
                    notify();
                };

                // 사용자가 스케줄러에서 수정 중인지 확인
                // [v2.17.1 수정] 스케줄러 화면을 보고 있지 않다면(딴짓 중이라면) 묻지도 따지지도 않고 업데이트
                if (isSchedulerActive && BossDataManager.isDraftDirty()) {
                    const todayStr = formatMonthDay(now);
                    const tomorrow = new Date(now);
                    tomorrow.setDate(now.getDate() + 1);
                    const tomorrowStr = formatMonthDay(tomorrow);

                    const msg = `오늘(${todayStr})과 내일(${tomorrowStr})의 최신 일정으로 업데이트 하시겠습니까?\n\n(확인: 새 일정 로드, 취소: 현재 수정 내용 유지)`;
                    if (confirm(msg)) {
                        performUpdate();
                        BossDataManager.syncDraftWithMain(); // 확인 시 Draft도 덮어씌움
                    } else {
                        // 취소 시 원본 SSOT만 업데이트하여 알람 정확도 유지 (Draft는 보존)
                        bossSchedule = _expandAndReconstruct(bossSchedule);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule));
                        LocalStorageManager.set('lastAutoUpdateTimestamp', now.getTime());
                        notify();
                    }
                } else {
                    // 수정 중이 아니거나, 딴 화면 보고 있으면 조용히 업데이트
                    performUpdate();
                    // 스케줄러 화면이 아니라면 Draft도 굳이 유지할 필요 없으므로 최신화
                    if (!isSchedulerActive) {
                        BossDataManager.syncDraftWithMain();
                    }
                }
            }
        },
        getBossInterval: (bossName, contextId) => {
            return _getInternalBossInterval(bossName, contextId);
        },
        /**
         * 입력된 보스 스케줄의 논리적 일관성을 검증합니다.
         * (v3.0.1 수정: 사용자의 입력은 절대적이므로 젠 주기 배수 체크 등 시스템 개입을 제거하고 무조건 허용합니다.)
         */
        validateBossSchedule: () => {
            return { isValid: true };
        },
        subscribe: (callback) => {
            subscribers.push(callback);
        },
        getBossSchedule: (uiFilter = true) => {
            if (!bossSchedule) return [];

            if (uiFilter) {
                // UI 표출용: 오늘~내일(48시간 윈도우) 이내의 일정만 필터링하여 반환
                const now = Date.now();
                const todayStart = new Date(now);
                todayStart.setHours(0, 0, 0, 0);
                const startTime = todayStart.getTime();
                const endTime = startTime + (48 * 60 * 60 * 1000);

                const filtered = bossSchedule.filter(item => {
                    if (item.type === 'date') return true;
                    if (!item.scheduledDate) return false;
                    const t = new Date(item.scheduledDate).getTime();
                    return t >= startTime && t <= endTime; // 오늘 00:00 ~ 내일 24:00
                });

                // 빈 날짜 헤더 제거 로직 추가
                const result = [];
                for (let i = 0; i < filtered.length; i++) {
                    const item = filtered[i];
                    if (item.type === 'date') {
                        // 다음 아이템이 보스이고, 그 보스의 날짜가 이 헤더와 일치하는 동안만 유지
                        const nextBoss = filtered.slice(i + 1).find(f => f.type === 'boss');
                        if (nextBoss) {
                            const d = new Date(nextBoss.scheduledDate);
                            const nextBossDateStr = `${padNumber(d.getMonth() + 1)}.${padNumber(d.getDate())}`;
                            if (nextBossDateStr === item.date) {
                                result.push(item);
                                continue;
                            }
                        }
                        // 보여줄 보스가 없는 헤더는 버림
                        continue;
                    }
                    result.push(item);
                }
                return result;
            }
            // 내부 로직용: 전체 데이터 반환 (미래 앵커 포함)
            return bossSchedule;
        },
        setBossSchedule: (newSchedule) => {
            // 들어온 리스트를 즉시 48시간(오늘~내일) 분량으로 확장하고 정규화함
            bossSchedule = _expandAndReconstruct(newSchedule || []);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule)); // 원본 영구 저장
            notify();
        },
        // --- Draft Management ---
        // --- Draft Management (List-based Isolation) ---
        getDraftSchedule: (listId) => {
            const draftKey = listId ? `${DRAFT_STORAGE_KEY}_${listId}` : DRAFT_STORAGE_KEY;

            // 1. 해당 List ID의 Draft 로드 시도
            const savedDraft = localStorage.getItem(draftKey);
            let draft = null;

            if (savedDraft) {
                try {
                    draft = JSON.parse(savedDraft, (key, value) => {
                        if (key === 'scheduledDate') return new Date(value);
                        return value;
                    });
                } catch (e) {
                    console.error("Draft parsing error", e);
                }
            }

            // 2. Draft가 없으면 빈 배열(혹은 초기화 필요) 상태 반환
            // (주의: 여기서는 원본 SSOT 복사를 하지 않음. SSOT는 '현재 선택된 게임'과 무관할 수 있으므로,
            //  Draft가 없으면 호출 측에서 초기 데이터를 채워 넣어야 함.)
            // -> 단, 현재 로직 호환성을 위해 draft가 없으면 빈 배열 리턴
            if (!draft) {
                draft = [];
            }

            return draft;
        },

        setDraftSchedule: (listId, newDraft) => {
            const draftKey = listId ? `${DRAFT_STORAGE_KEY}_${listId}` : DRAFT_STORAGE_KEY;
            localStorage.setItem(draftKey, JSON.stringify(newDraft));
        },

        /**
         * 특정 프리셋 리스트 ID와 전달된 스케줄의 보스 이름들이 1:1로 일치하는지 확인합니다.
         */
        isPresetNamesMatching: async (listId, schedule) => {
            const { getBossNamesForGame, isPresetList } = await import('./boss-scheduler-data.js');

            if (!isPresetList(listId)) return true; // 프리셋이 아니면 검증할 필요 없음

            const officialNames = getBossNamesForGame(listId);
            const currentNames = [...new Set(schedule.filter(item => item.type === 'boss').map(b => b.name))];

            // 보스 '종류'의 개수가 다르면 정합성 깨짐
            if (officialNames.length !== currentNames.length) return false;
            // 모든 현재 보스 종류가 공식 프리셋에 포함되어 있어야 함
            return currentNames.every(name => officialNames.includes(name));
        },

        /**
         * 스케줄 데이터에서 보스 이름 목록 텍스트를 추출합니다. (커스텀 리스트 저장용)
         */
        extractBossNamesText: (schedule) => {
            return schedule
                .filter(item => item.type === 'boss')
                .map(item => item.name)
                .join('\n');
        },

        // 특정 Draft 내용을 메인 SSOT로 승격(Commit)
        commitDraft: (listId) => {
            const draftKey = listId ? `${DRAFT_STORAGE_KEY}_${listId}` : DRAFT_STORAGE_KEY;
            const savedDraft = localStorage.getItem(draftKey);

            if (savedDraft) {
                let draftSchedule;
                try {
                    draftSchedule = JSON.parse(savedDraft, (key, value) => {
                        if (key === 'scheduledDate') return new Date(value);
                        return value;
                    });
                } catch (e) { console.error(e); return; }

                // 커밋 시 48시간 확장 로직 적용 -> SSOT 갱신
                bossSchedule = _expandAndReconstruct(draftSchedule);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(bossSchedule));

                // 중요: Commit 후에는 현재 Draft가 SSOT와 동일해지므로 유지해도 됨.
                // 또는 SSOT가 바뀌었으니 다른 알림 로직 트리거
                notify();
            }
        },

        expandSchedule: (items) => {
            return _expandAndReconstruct(items);
        },

        // 특정 리스트 Draft 삭제 (초기화)
        clearDraft: (listId) => {
            const draftKey = listId ? `${DRAFT_STORAGE_KEY}_${listId}` : DRAFT_STORAGE_KEY;
            localStorage.removeItem(draftKey);
        },
        // ------------------------
        setNextBossInfo: (nextBoss, minTimeDiff) => {
            _nextBoss = nextBoss;
            _minTimeDiff = minTimeDiff;
            notify();
        },
        getNextBossInfo: () => ({ nextBoss: _nextBoss, minTimeDiff: _minTimeDiff }),

        getAllUpcomingBosses: (nowTime = Date.now()) => {
            const nowAsDate = new Date(nowTime);
            const manualBosses = bossSchedule
                .filter(item => item.type === 'boss' && item.scheduledDate)
                .map(boss => ({
                    ...boss,
                    timestamp: new Date(boss.scheduledDate).getTime(),
                    isFixed: false
                }))
                .filter(boss => boss.timestamp > nowTime);

            const fixedBosses = LocalStorageManager.getFixedAlarms()
                .filter(alarm => alarm.enabled)
                .map(alarm => {
                    const nextOccurrence = calculateNextOccurrence(alarm, nowAsDate);
                    return {
                        ...alarm,
                        timestamp: nextOccurrence ? nextOccurrence.getTime() : 0,
                        isFixed: true,
                        scheduledDate: nextOccurrence
                    };
                })
                .filter(boss => boss.timestamp > nowTime);

            return [...manualBosses, ...fixedBosses]
                .sort((a, b) => a.timestamp - b.timestamp);
        },

        getBossStatusSummary: (nowTime = Date.now()) => {
            const all = BossDataManager.getAllUpcomingBosses(nowTime);
            const nextBoss = all[0] || null;
            const minTimeDiff = nextBoss ? nextBoss.timestamp - nowTime : Infinity;
            const imminentBosses = all.filter(boss => (boss.timestamp - nowTime) <= BOSS_THRESHOLDS.IMMINENT);
            return { nextBoss, minTimeDiff, imminentBosses, allUpcoming: all };
        },

        getUpcomingBosses: (count) => {
            return BossDataManager.getAllUpcomingBosses().slice(0, count);
        },

        getImminentBosses: () => {
            return BossDataManager.getBossStatusSummary().imminentBosses;
        }
    };
})();

export const LocalStorageManager = (() => {
    let fixedAlarms = [];
    let logVisibilityState = true;
    let alarmRunningState = false;
    let crazyCalculatorRecords = [];
    let muteState = false;
    let volume = 1;
    let preMuteVolume = 1;

    function saveFixedAlarms() {
        localStorage.setItem('fixedAlarms', JSON.stringify(fixedAlarms));
    }

    function loadFixedAlarms() {
        const savedAlarms = localStorage.getItem('fixedAlarms');
        if (savedAlarms) {
            let loadedAlarms = JSON.parse(savedAlarms);
            let needsSave = false;
            loadedAlarms.forEach(alarm => {
                if (!Object.prototype.hasOwnProperty.call(alarm, 'days')) {
                    alarm.days = [0, 1, 2, 3, 4, 5, 6];
                    needsSave = true;
                }
            });
            fixedAlarms = loadedAlarms;
            if (needsSave) {
                saveFixedAlarms();
            }
        } else {
            const oldFixedAlarmStates = localStorage.getItem('fixedAlarmStates');
            if (oldFixedAlarmStates) {
                const parsedOldStates = JSON.parse(oldFixedAlarmStates);
                const defaultOldFixedBossSchedule = [
                    { time: "12:00", name: "대륙 침략자" },
                    { time: "20:00", name: "대륙 침략자" },
                    { time: "13:00", name: "발할라" },
                    { time: "18:00", name: "발할라" },
                    { time: "21:00", name: "발할라" },
                ];
                fixedAlarms = defaultOldFixedBossSchedule.map((boss, index) => ({
                    id: `fixed-${index}`,
                    name: boss.name,
                    time: boss.time,
                    enabled: parsedOldStates.individual[index] || false,
                    days: [0, 1, 2, 3, 4, 5, 6]
                }));
                localStorage.removeItem('fixedAlarmStates');
            } else {
                fixedAlarms = [
                    { id: 'fixed-1', name: '대륙 침략자', time: '12:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-2', name: '대륙 침략자', time: '20:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-3', name: '발할라', time: '13:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-4', name: '발할라', time: '18:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                    { id: 'fixed-5', name: '발할라', time: '21:00', enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
                ];
            }
            saveFixedAlarms();
        }
    }

    function saveLogVisibilityState() {
        localStorage.setItem('logVisibilityState', JSON.stringify(logVisibilityState));
    }

    function loadLogVisibilityState() {
        const savedState = localStorage.getItem('logVisibilityState');
        if (savedState !== null) {
            logVisibilityState = JSON.parse(savedState);
        } else {
            logVisibilityState = true;
        }
    }

    function saveAlarmRunningState() {
        localStorage.setItem('alarmRunningState', JSON.stringify(alarmRunningState));
    }

    function loadAlarmRunningState() {
        const savedState = localStorage.getItem('alarmRunningState');
        if (savedState !== null) {
            alarmRunningState = JSON.parse(savedState);
        } else {
            alarmRunningState = false;
        }
    }


    function saveCrazyCalculatorRecords() {
        localStorage.setItem('crazyCalculatorRecords', JSON.stringify(crazyCalculatorRecords));
    }

    function loadCrazyCalculatorRecords() {
        const savedRecords = localStorage.getItem('crazyCalculatorRecords');
        if (savedRecords) {
            crazyCalculatorRecords = JSON.parse(savedRecords);
        } else {
            crazyCalculatorRecords = [];
        }
    }

    function saveMuteState() {
        localStorage.setItem('muteState', JSON.stringify(muteState));
    }

    function loadMuteState() {
        const savedState = localStorage.getItem('muteState');
        if (savedState !== null) {
            muteState = JSON.parse(savedState);
        } else {
            muteState = false;
        }
    }

    function saveVolume() {
        localStorage.setItem('volume', JSON.stringify(volume));
    }

    function loadVolume() {
        const savedVolume = localStorage.getItem('volume');
        if (savedVolume !== null) {
            volume = JSON.parse(savedVolume);
        } else {
            volume = 1;
        }
    }

    function savePreMuteVolume() {
        localStorage.setItem('preMuteVolume', JSON.stringify(preMuteVolume));
    }

    function loadPreMuteVolume() {
        const savedPreMuteVolume = localStorage.getItem('preMuteVolume');
        if (savedPreMuteVolume !== null) {
            preMuteVolume = JSON.parse(savedPreMuteVolume);
        } else {
            preMuteVolume = 1;
        }
    }

    return {
        get: (key) => {
            const value = localStorage.getItem(key);
            if (value === null) return null;
            try {
                return JSON.parse(value);
            } catch {
                // If it's not valid JSON, it might be a raw string
                return value;
            }
        },
        set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
        getFixedAlarms: () => fixedAlarms,
        getFixedAlarmById: (id) => fixedAlarms.find(alarm => alarm.id === id),
        addFixedAlarm: (alarm) => {
            fixedAlarms.push(alarm);
            saveFixedAlarms();
        },
        updateFixedAlarm: (id, updatedAlarm) => {
            const index = fixedAlarms.findIndex(alarm => alarm.id === id);
            if (index !== -1) {
                fixedAlarms[index] = { ...fixedAlarms[index], ...updatedAlarm };
                saveFixedAlarms();
            }
        },
        deleteFixedAlarm: (id) => {
            fixedAlarms = fixedAlarms.filter(alarm => alarm.id !== id);
            saveFixedAlarms();
        },
        exportFixedAlarms: () => {
            const jsonString = JSON.stringify(fixedAlarms);
            return btoa(encodeURIComponent(jsonString));
        },
        importFixedAlarms: (encodedData) => {
            try {
                const decodedJsonString = decodeURIComponent(atob(encodedData));
                const decoded = JSON.parse(decodedJsonString);
                if (Array.isArray(decoded) && decoded.every(item => item.id && item.name && item.time)) {
                    fixedAlarms = decoded;
                    saveFixedAlarms();
                    return true;
                }
            } catch (e) {
                console.error("Failed to import fixed alarms:", e);
            }
            return false;
        },
        getLogVisibilityState: () => logVisibilityState,
        setLogVisibilityState: (state) => { logVisibilityState = state; saveLogVisibilityState(); },
        getAlarmRunningState: () => alarmRunningState,
        setAlarmRunningState: (state) => { alarmRunningState = state; saveAlarmRunningState(); },
        getMuteState: () => muteState,
        setMuteState: (state) => { muteState = state; saveMuteState(); },
        getVolume: () => volume,
        setVolume: (newVolume) => { volume = newVolume; saveVolume(); },
        getPreMuteVolume: () => preMuteVolume,
        setPreMuteVolume: (newPreMuteVolume) => { preMuteVolume = newPreMuteVolume; savePreMuteVolume(); },
        getCrazyCalculatorRecords: () => crazyCalculatorRecords,
        setCrazyCalculatorRecords: (records) => { crazyCalculatorRecords = records; saveCrazyCalculatorRecords(); },
        clearCrazyCalculatorRecords: () => { crazyCalculatorRecords = []; saveCrazyCalculatorRecords(); },
        init: () => {
            loadFixedAlarms();
            loadLogVisibilityState();
            loadAlarmRunningState();
            loadCrazyCalculatorRecords();
            loadMuteState();
            loadVolume();
            loadPreMuteVolume();
        }
    };
})();
