"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { getSequence } from "lib/get-sequence";
import ButtonBox from "../../components/buttons/button-box";
import AddButton from "../../components/buttons/add-button";
import FormInput from "../../components/form-input";
import DateTimeInput from "./date-time-input";

interface Schedule {
  id?: number;
  title: string;
  url?: string;
  dateStart: string;
  dateEnd: string;
}

interface CalendarBlock {
  id?: number;
  type: number;
  sequence: number;
  style: number;
  schedule: Schedule[];
}

interface ScheduleFormProps {
  mode: "add" | "edit";
  initialData?: Schedule | null;
  calendarBlockId?: number | null;
}

export default function ScheduleForm({
  mode,
  initialData,
  calendarBlockId,
}: ScheduleFormProps) {
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [calendarBlock, setCalendarBlock] = useState<CalendarBlock | null>(
    null,
  );
  const router = useRouter();

  // 수정 모드에서 폼 초기값 설정
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const startDateTime = new Date(initialData.dateStart);
      const endDateTime = new Date(initialData.dateEnd);

      setStartDate(startDateTime.toISOString().split("T")[0]);
      setStartTime(
        `${startDateTime.getUTCHours().toString().padStart(2, "0")}:${startDateTime.getUTCMinutes().toString().padStart(2, "0")}`,
      );
      setEndDate(endDateTime.toISOString().split("T")[0]);
      setEndTime(
        `${endDateTime.getUTCHours().toString().padStart(2, "0")}:${endDateTime.getUTCMinutes().toString().padStart(2, "0")}`,
      );
      setTitle(initialData.title);
      setUrl(initialData.url || "");
    }
  }, [mode, initialData]);

  // API에서 데이터 1회 호출
  useEffect(() => {
    const fetchCalendarBlock = async () => {
      if (mode === "edit") return;

      try {
        const token = sessionStorage.getItem("token");
        if (!token) {
          throw new Error("로그인이 필요합니다.");
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/link/list`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.code === 200 && Array.isArray(data.data)) {
          const existingCalendarBlock = data.data.find(
            (item: CalendarBlock) => item.type === 7,
          );
          if (existingCalendarBlock) {
            setCalendarBlock(existingCalendarBlock);
          }
        }
      } catch (error) {
        console.error("Error fetching calendar block:", error);
      }
    };

    fetchCalendarBlock();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newSchedule: Schedule = {
      ...(mode === "edit" && initialData?.id ? { id: initialData.id } : {}),
      title,
      url: url || undefined,
      dateStart: `${startDate}T${startTime}:00.000Z`,
      dateEnd: `${endDate}T${endTime}:00.000Z`,
    };

    try {
      const token = sessionStorage.getItem("token");
      if (!token) throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");

      const listResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/link/list`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!listResponse.ok) {
        throw new Error("기존 일정을 불러오는데 실패했습니다.");
      }

      const listData = await listResponse.json();
      const existingCalendarBlock = listData.data.find(
        (item: CalendarBlock) => item.type === 7,
      );

      let requestBody;
      const blockId = mode === "edit" ? calendarBlockId : calendarBlock?.id;

      if (blockId) {
        let updatedSchedules;
        if (mode === "edit" && existingCalendarBlock) {
          updatedSchedules = existingCalendarBlock.schedule.map(
            (s: Schedule) => (s.id === initialData?.id ? newSchedule : s),
          );
        } else {
          updatedSchedules = [
            ...(existingCalendarBlock?.schedule || []),
            newSchedule,
          ];
        }

        requestBody = {
          id: blockId,
          type: 7,
          sequence: existingCalendarBlock?.sequence || 1,
          style: existingCalendarBlock?.style || 1,
          schedule: updatedSchedules,
        };
      } else {
        // 새로운 캘린더 블록 생성 및 일정 추가
        const nextSequence = await getSequence(token);
        if (!nextSequence) return;
        requestBody = {
          type: 7,
          sequence: nextSequence + 1,
          style: 1,
          schedule: [newSchedule],
        };
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/link/${blockId ? "update" : "add"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        throw new Error(
          mode === "edit"
            ? "일정 수정에 실패했습니다."
            : "일정 추가에 실패했습니다.",
        );
      }

      const data = await response.json();
      if (data.code === 200) {
        alert(
          mode === "edit"
            ? "일정이 성공적으로 수정되었습니다."
            : "일정이 성공적으로 추가되었습니다.",
        );
        router.push("/admin/calendar");
      } else {
        throw new Error("서버 응답 오류");
      }
    } catch (error) {
      console.error(
        mode === "edit" ? "일정 수정 중 오류 발생" : "일정 추가 중 오류 발생",
        error,
      );
      alert(error instanceof Error ? error.message : "오류가 발생했습니다.");
    }
  };

  const timeOptions = Array.from(
    { length: 24 },
    (_, i) => `${i.toString().padStart(2, "0")}:00`,
  );

  const summitButtonDisabled =
    !startDate || !startTime || !endDate || !endTime || !title;

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-8">
      <DateTimeInput
        label="오픈 일시"
        dateValue={startDate}
        timeValue={startTime}
        onDateChange={setStartDate}
        onTimeChange={setStartTime}
        required
      />
      <DateTimeInput
        label="종료 일시"
        dateValue={endDate}
        timeValue={endTime}
        onDateChange={setEndDate}
        onTimeChange={setEndTime}
        minDate={startDate}
        required
      />
      <FormInput
        label="일정 이름"
        id="title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-md border border-gray-300 p-2 text-sm placeholder-gray-300 focus:border-[#FFCAB5] focus:outline-none focus:ring-[#FFCAB5]"
        placeholder="알리고 싶은 일정 내용이 잘 드러나면 좋아요"
        required
      />
      <FormInput
        label="연결할 주소"
        id="url"
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="rounded-md border border-gray-300 p-2 text-sm placeholder-gray-300 focus:border-[#FFCAB5] focus:outline-none focus:ring-[#FFCAB5]"
        placeholder="일정에 관심 있을 때 이동시키고 싶은 링크가 있나요?"
      />
      <ButtonBox>
        <AddButton
          type="submit"
          text={mode === "edit" ? "수정 완료" : "추가 완료"}
          disabled={summitButtonDisabled}
        />
      </ButtonBox>
    </form>
  );
}
