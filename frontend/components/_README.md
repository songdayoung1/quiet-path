# Quiet Path · 신규 컴포넌트 (drop-in)

`화면 리디자인.html`에서 시각화한 카드/곡선 시스템을 React + TypeScript 컴포넌트로 정리했습니다. **옵션 A(엽서) / 옵션 C(무드 캔버스)는 포함하지 않습니다** — 옵션 B(일기 페이지)만 컴포넌트화.

## 파일 목록

| 파일 | 목적 |
|---|---|
| `PastDirectionsTrail.tsx` | "지나온 방향들" 트레일 (단일 SVG 곡선 + 시작 앵커 + 카드 마커/연결선) |
| `AISummaryCapsule.tsx` | "방향 상세" AI 회고 캡슐 — `locked` / `generating` / `ready` 3-state |
| `RecordDetailDiary.tsx` | "기록 상세" — 일기 페이지 (사진/한단어/내일 모두 옵셔널) |
| `LogEditorCards.tsx` | "기록 생성" 카드 시스템 — 재활용 가능한 `QpCard`/`QpCardHeader`/`QpInput`/`QpTextArea`/`QpPhotoSlot` |

## 사용 위치

### 1. `PastDirectionsView.tsx`

기존 timeline 매핑 자리를 통째로 교체:

```tsx
import { DirectionsTrail } from '../components/PastDirectionsTrail';
import { AISummaryCapsule } from '../components/AISummaryCapsule';

// 목록 모드
<DirectionsTrail
  directions={sortedDirections}
  records={records}
  onSelect={setSelectedDirection}
/>

// 상세 모드 (selectedDirection이 있을 때) — 기존 "AI 회고 캡슐" 자리에:
<AISummaryCapsule
  state={
    isLocked ? 'locked'
    : isGenerating ? 'generating'
    : 'ready'
  }
  unlockDate={selectedDirection.reviewAt}
  recordCount={flowRecords.length}
  summary={{ headline: '천천히, 그러나 확실하게 나아갔습니다.', body: '...' }}
  version="v.1 · 05.21"
  onRegenerate={() => handleSummarize()}
  onLike={() => like(summaryId)}
/>
```

### 2. `RecordsView.tsx` → 기록 클릭 시

```tsx
import { RecordDetailDiary } from '../components/RecordDetailDiary';

{openedRecord && (
  <RecordDetailDiary
    record={openedRecord}
    nickname={state.auth?.nickname}
    pageNumber={records.findIndex(r => r.id === openedRecord.id) + 1}
    onClose={() => setOpenedRecord(null)}
    onEdit={() => openEditor(openedRecord)}
    onShare={() => shareRecord(openedRecord)}
    onHide={() => hideRecord(openedRecord.id)}
  />
)}
```

`record.imageUrl` / `record.oneWordText` / `record.tomorrowText`가 있으면 자동 노출, 없으면 해당 섹션이 깔끔하게 사라집니다.

### 3. `LogEditorView.tsx`

기존 4개 섹션을 카드 시스템으로:

```tsx
import { QpCard, QpCardHeader, QpInput, QpTextArea, QpPhotoSlot } from '../components/LogEditorCards';

<QpCard>
  <QpCardHeader title="오늘의 기분" index="01 · MOOD" />
  <div className="flex flex-wrap justify-center gap-2">
    {MOOD_STICKERS.map(s => (
      <MoodSticker key={s.code} code={s.code} selected={moodCode === s.code} onClick={() => setMoodCode(s.code)} />
    ))}
  </div>
</QpCard>

<QpCard className="mt-4">
  <QpCardHeader title="오늘의 기록" index="02 · RECORD" />
  <QpTextArea value={action} onChange={e => setAction(e.target.value)} placeholder="기억에 남는 순간이나 한 일을 편하게 적어주세요." />
</QpCard>

<QpCard className="mt-4">
  <QpCardHeader title="오늘의 한 단어" index="03 · WORD" />
  <QpInput value={oneWordText} onChange={e => setOneWordText(e.target.value)} placeholder="다짐, 평온, 위로 등…" />
</QpCard>

<QpCard className="mt-4">
  <QpCardHeader title="내일의 메모" index="04 · MEMO" hint="선택 사항이에요. 부담 없이 적어보세요." />
  <QpInput value={tomorrowText} onChange={e => setTomorrowText(e.target.value)} placeholder="내일의 작은 목표나 계획을 적어보세요." className="mb-4" />
  <p className="block text-[11px] font-bold text-mist-500 mb-2 pl-[13px] tracking-wide">오늘의 사진 한 장</p>
  <QpPhotoSlot
    imageUrl={imageUrl}
    onPick={() => fileInputRef.current?.click()}
    onClear={() => setImageUrl('')}
  />
</QpCard>
```

## Tailwind 토큰 의존

이미 `frontend/index.html`에 정의된 토큰만 사용합니다:
- `mist` · `point` · `lavender` · `mint` · `amber` · `rose` · `blue` · `green`

추가 설정 없음.

## 다음 단계

- 마음에 들면 위 사용 예시대로 4개 View에 끼우시면 됩니다
- `lucide-react` 아이콘이 더 좋다면 컴포넌트 내부 SVG는 그대로 두고 import만 교체해도 동작합니다
