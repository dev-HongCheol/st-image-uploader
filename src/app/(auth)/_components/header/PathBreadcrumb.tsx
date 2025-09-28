"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo } from "react";

type PathInfo = {
  name: string;
  fullPath: string;
};

/**
 * 경로 문자열의 유효성을 검사하는 함수
 * @param path - 검사할 경로 문자열
 * @returns 유효한 경로인지 여부
 */
const isValidPath = (path: string): boolean => {
  if (!path || typeof path !== "string") return false;

  // 빈 문자열이면 유효 (루트 경로)
  if (path.trim() === "") return true;

  // 잘못된 패턴들 체크
  const invalidPatterns = [
    /\/\/+/, // 연속된 슬래시 (//, ///, 등)
    /^[^/]/, // / 없이 시작하는 경우
    /\/$/, // 마지막에 슬래시로 끝나는 경우
    /[<>:"|?*]/, // 파일명에 사용할 수 없는 특수문자
    /\.\.$/, // .. 으로 끝나는 경우
    /\/\.$/, // /. 패턴
    /\/\.\.$/, // /.. 패턴
  ];

  return !invalidPatterns.some((pattern) => pattern.test(path));
};

/**
 * 경로 문자열을 파싱하여 breadcrumb용 데이터로 변환하는 함수
 * @param pathString - 파싱할 경로 문자열
 * @returns PathInfo 배열
 */
const parsePath = (pathString: string): PathInfo[] => {
  // 경로 유효성 검사
  if (!isValidPath(pathString)) {
    // console.warn(`Invalid path detected: ${pathString}`);
    return [];
  }

  // 앞뒤 슬래시 제거하고 빈 세그먼트 필터링
  const cleanPath = pathString.replace(/^\/+|\/+$/g, "");

  if (!cleanPath) return [];

  const segments = cleanPath
    .split("/")
    .filter((segment) => segment.trim() !== "")
    .map((segment) => segment.trim());

  // 각 세그먼트에 대해 PathInfo 생성
  return segments.map((segment, index) => ({
    name: segment,
    fullPath: "/" + segments.slice(0, index + 1).join("/"),
  }));
};

/**
 * 경로 기반 breadcrumb 네비게이션 컴포넌트
 * URL의 path 쿼리 파라미터를 기반으로 breadcrumb을 생성합니다.
 */
const PathBreadcrumb = () => {
  const searchParams = useSearchParams();
  const currentPath = searchParams.get("path") || "";

  // 경로 파싱 결과를 메모이제이션
  const pathInfoArr = useMemo(() => {
    return parsePath(currentPath);
  }, [currentPath]);

  // 경로가 없거나 유효하지 않으면 렌더링하지 않음
  if (pathInfoArr.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* 홈 링크 */}
        <BreadcrumbItem>
          <Link href="/">홈</Link>
        </BreadcrumbItem>

        {pathInfoArr.length > 0 && <BreadcrumbSeparator />}

        {/* 경로 세그먼트들 */}
        {pathInfoArr.map((pathInfo, index) => (
          <Fragment key={pathInfo.fullPath}>
            <BreadcrumbItem>
              <Link
                href={
                  pathInfo.fullPath === currentPath
                    ? "#"
                    : `/?path=${encodeURIComponent(pathInfo.fullPath)}`
                }
                className={
                  index === pathInfoArr.length - 1 ? "font-semibold" : ""
                }
              >
                {pathInfo.name}
              </Link>
            </BreadcrumbItem>
            {index !== pathInfoArr.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default PathBreadcrumb;
