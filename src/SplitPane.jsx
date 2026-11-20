import { useRef, useState } from 'react';

const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;

function clampRatio(value) {
    if (!Number.isFinite(value)) return 0.5;
    return Math.min(MAX_RATIO, Math.max(MIN_RATIO, value));
}

function readRatio(storageKey, defaultRatio) {
    try {
        const saved = window.localStorage.getItem(storageKey);
        return clampRatio(saved === null ? defaultRatio : Number(saved));
    } catch {
        return clampRatio(defaultRatio);
    }
}

/**
 * 左右分栏, 中间的竖条可拖动调整占比(比例存 localStorage, 刷新后保留).
 * 双击竖条恢复默认比例; 聚焦竖条后可用方向键微调.
 */
export default function SplitPane({ left, right, storageKey = 'swapper-split-ratio', defaultRatio = 0.5, className = '' }) {
    const containerRef = useRef(null);
    const [ratio, setRatio] = useState(() => readRatio(storageKey, defaultRatio));

    function save(value) {
        try { window.localStorage.setItem(storageKey, String(value)); } catch { /* ignore */ }
    }

    function startResize(event) {
        if (event.button !== 0) return;
        event.preventDefault();
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        // 记住按下时鼠标相对左栏右边缘的偏移, 拖动时竖条不会"跳"一下
        const sideRight = container.firstElementChild.getBoundingClientRect().right;
        const grabOffset = event.clientX - sideRight;
        let latest = ratio;
        document.body.classList.add('split-resizing');
        function move(moveEvent) {
            latest = clampRatio((moveEvent.clientX - grabOffset - rect.left) / rect.width);
            setRatio(latest);
        }
        function up() {
            save(latest);
            document.body.classList.remove('split-resizing');
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        }
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }

    function onKeyDown(event) {
        const step = event.shiftKey ? 0.1 : 0.02;
        let next = null;
        if (event.key === 'ArrowLeft') next = ratio - step;
        else if (event.key === 'ArrowRight') next = ratio + step;
        else if (event.key === 'Home') next = MIN_RATIO;
        else if (event.key === 'End') next = MAX_RATIO;
        if (next === null) return;
        event.preventDefault();
        next = clampRatio(next);
        setRatio(next);
        save(next);
    }

    function reset() {
        const next = clampRatio(defaultRatio);
        setRatio(next);
        save(next);
    }

    return (
        <div ref={containerRef} className={`split-pane ${className}`}>
            <div className='split-pane-side' style={{ flexBasis: `${(ratio * 100).toFixed(2)}%` }}>
                {left}
            </div>
            <div
                className='split-pane-resizer'
                role='separator'
                aria-orientation='vertical'
                aria-label='Resize panels'
                aria-valuemin={MIN_RATIO * 100}
                aria-valuemax={MAX_RATIO * 100}
                aria-valuenow={Math.round(ratio * 100)}
                tabIndex={0}
                title='Drag to resize, double-click to reset'
                onPointerDown={startResize}
                onDoubleClick={reset}
                onKeyDown={onKeyDown}
            />
            <div className='split-pane-main'>
                {right}
            </div>
        </div>
    );
}
