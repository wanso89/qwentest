import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FiDatabase, FiSearch, FiCode, FiTable, FiSend, FiLoader, FiAlertCircle, 
  FiHelpCircle, FiInfo, FiPlay, FiExternalLink, FiTrendingUp, FiCommand, 
  FiZap, FiArrowRight, FiColumns, FiTerminal, FiCpu, FiSquare, FiUser,
  FiBarChart2, FiPieChart, FiList, FiClock, FiMessageSquare, FiMessageCircle,
  FiSave, FiChevronRight, FiChevronLeft, FiActivity, FiX, FiTrash2, FiChevronDown,
  FiCornerDownRight, FiPlayCircle, FiDownload, FiChevronsDown, FiChevronsUp, FiMaximize, FiMinimize, FiRefreshCw, FiClipboard, FiCheck, FiRotateCw
} from 'react-icons/fi';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as vs2015 } from 'react-syntax-highlighter/dist/esm/styles/prism';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// SQL 언어 등록
SyntaxHighlighter.registerLanguage('sql', sql);

// 색상 테마 정의 - 더 풍부한 색상 팔레트로 업그레이드
const CHART_COLORS = [
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#f43f5e', // rose-500
  '#64748b', // slate-500
  '#6ee7b7', // emerald-300
  '#38bdf8', // sky-400
  '#fcd34d', // amber-300
  '#c084fc', // purple-400
  '#4ade80', // green-400
  '#fb7185', // rose-400
  '#2dd4bf', // teal-400
  '#a3e635', // lime-400
];

// 랜덤 색상 생성 함수
const getRandomColor = () => {
  return CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)];
};

// 클립보드 복사 안전하게 처리하는 함수 추가 (로그 제거 및 토스트 피드백 추가)
const safeCopyToClipboard = (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          // 복사 성공 시 시각적 피드백 표시
          showToast("클립보드에 복사되었습니다.");
        })
        .catch(err => {
          // 조용히 실패 처리하고 대체 방법 시도
          fallbackCopyToClipboard(text);
        });
    } else {
      // 클립보드 API 미지원 시 대체 방법 사용
      fallbackCopyToClipboard(text);
    }
  } catch (err) {
    // 모든 방법 실패 시 대체 방법 시도
    fallbackCopyToClipboard(text);
  }
};

// 대체 복사 방식을 별도 함수로 분리
const fallbackCopyToClipboard = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';  // 화면 밖으로
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showToast("클립보드에 복사되었습니다.");
    }
  } catch (err) {
    // 실패 시 조용히 처리 (사용자 경험에 영향 없도록)
  }
  document.body.removeChild(textarea);
};

// 간단한 토스트 메시지 표시 함수
const showToast = (message) => {
  // 이미 토스트가 있으면 제거
  const existingToast = document.getElementById('clipboard-toast');
  if (existingToast) {
    document.body.removeChild(existingToast);
  }
  
  // 새 토스트 생성
  const toast = document.createElement('div');
  toast.id = 'clipboard-toast';
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = 'rgba(79, 70, 229, 0.9)';
  toast.style.color = 'white';
  toast.style.padding = '8px 16px';
  toast.style.borderRadius = '4px';
  toast.style.fontSize = '0.875rem';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.25)';
  toast.textContent = message;
  
  // 토스트 애니메이션
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease-in-out';
  
  // 문서에 추가
  document.body.appendChild(toast);
  
  // 애니메이션 시작
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // 토스트 자동 제거
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 2000);
};

// DB 스키마를 사용자 친화적으로 파싱하는 함수
const parseDBSchema = (schemaText) => {
  if (!schemaText) return null;
  
  try {
    // 테이블 기준으로 분리
    const tableMatches = schemaText.match(/CREATE TABLE.*?;/gs) || [];
    
    if (tableMatches.length === 0) {
      // DDL이 없는 경우 원본 텍스트 반환
      return (
        <pre className="text-xs text-gray-400 whitespace-pre-wrap">
          {schemaText}
        </pre>
      );
    }
    
    // 테이블별 파싱 결과
    const parsedTables = tableMatches.map(tableSchema => {
      // 테이블 이름 추출
      const tableNameMatch = tableSchema.match(/CREATE TABLE (?:"([^"]+)"|([^\s(]+))/i);
      const tableName = tableNameMatch ? (tableNameMatch[1] || tableNameMatch[2]).replace(/"/g, '') : '알 수 없는 테이블';
      
      // 컬럼 정의 추출
      const columnsMatch = tableSchema.match(/\(([\s\S]*)\)/);
      if (!columnsMatch) return { tableName, columns: [] };
      
      const columnsText = columnsMatch[1];
      const columnLines = columnsText.split(',').map(line => line.trim()).filter(line => line && !line.startsWith('CONSTRAINT') && !line.startsWith('PRIMARY KEY') && !line.startsWith('FOREIGN KEY'));
      
      // 각 컬럼 파싱
      const columns = columnLines.map(columnLine => {
        const columnParts = columnLine.split(' ');
        if (columnParts.length < 2) return null;
        
        // 컬럼명과 타입 분리
        let columnName = columnParts[0].replace(/"/g, '');
        let dataType = columnParts.slice(1).join(' ');
        let isPrimaryKey = columnLine.toLowerCase().includes('primary key');
        let isNotNull = columnLine.toLowerCase().includes('not null');
        let isUnique = columnLine.toLowerCase().includes('unique');
        let hasDefault = columnLine.toLowerCase().includes('default');
        
        return { 
          columnName, 
          dataType, 
          isPrimaryKey, 
          isNotNull, 
          isUnique,
          hasDefault
        };
      }).filter(Boolean);
      
      return { tableName, columns };
    });
    
    // 테이블별 UI 렌더링
    return (
      <div className="space-y-4">
        {/* 전체 테이블 요약 및 가이드 */}
        <div className="bg-indigo-900/20 rounded-md p-3 border border-indigo-700/40">
          <h3 className="text-sm font-medium text-indigo-300 mb-2">사용 가능한 테이블 ({parsedTables.length}개)</h3>
          <div className="flex flex-wrap gap-2">
            {parsedTables.map((table, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-700/30 text-xs text-indigo-200 hover:bg-indigo-700/50 hover:text-white cursor-pointer transition-colors border border-indigo-600/30"
                onClick={() => safeCopyToClipboard(table.tableName)}
                title="클릭하여 테이블명 복사"
              >
                <FiTable size={10} className="mr-1" />
                {table.tableName}
                <span className="ml-1 text-indigo-400/70">({table.columns.length})</span>
              </span>
            ))}
          </div>
        </div>
        
        {parsedTables.map((table, idx) => (
          <div key={idx} className="bg-gray-800/30 rounded-md overflow-hidden border border-gray-700/40 shadow-sm transition-all hover:shadow-md hover:border-gray-600/60">
            <div className="bg-gray-800/70 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiTable size={14} className="text-indigo-400" />
                <span className="text-sm text-indigo-300 font-medium cursor-pointer" 
                  onClick={() => safeCopyToClipboard(table.tableName)} 
                  title="클릭하여 테이블명 복사"
                >
                  {table.tableName}
                </span>
              </div>
              <span className="text-xs text-gray-400 px-1.5 py-0.5 rounded-full bg-gray-800/50">
                {table.columns.length} 컬럼
              </span>
            </div>
            <div className="overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-800/70">
                  <tr>
                    <th className="py-1.5 px-3 text-left text-gray-400 font-medium">#</th>
                    <th className="py-1.5 px-3 text-left text-gray-400 font-medium">컬럼명</th>
                    <th className="py-1.5 px-3 text-left text-gray-400 font-medium">데이터 타입</th>
                    <th className="py-1.5 px-3 text-left text-gray-400 font-medium">속성</th>
                  </tr>
                </thead>
                <tbody>
                  {table.columns.map((column, colIdx) => (
                    <tr 
                      key={colIdx} 
                      className={`${colIdx % 2 === 0 ? 'bg-gray-800/10' : 'bg-gray-800/5'} border-t border-gray-700/20 hover:bg-gray-800/30 cursor-pointer`}
                      onClick={() => safeCopyToClipboard(`${table.tableName}.${column.columnName}`)}
                      title="클릭하여 테이블.컬럼명 복사"
                    >
                      <td className="py-1.5 px-3 text-gray-400 font-mono text-[10px]">{colIdx + 1}</td>
                      <td className="py-1.5 px-3 text-gray-300 flex items-center gap-1.5">
                        {column.isPrimaryKey && <span className="w-2 h-2 bg-amber-400 rounded-full" title="기본키"></span>}
                        {column.columnName}
                      </td>
                      <td className="py-1.5 px-3 text-gray-400 font-mono text-[10px]">
                        {column.dataType}
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex gap-1 flex-wrap">
                          {column.isPrimaryKey && (
                            <span className="px-1 py-0.5 rounded text-[9px] bg-amber-900/30 text-amber-300 border border-amber-700/30">
                              PK
                            </span>
                          )}
                          {column.isNotNull && (
                            <span className="px-1 py-0.5 rounded text-[9px] bg-blue-900/30 text-blue-300 border border-blue-700/30">
                              NOT NULL
                            </span>
                          )}
                          {column.isUnique && (
                            <span className="px-1 py-0.5 rounded text-[9px] bg-purple-900/30 text-purple-300 border border-purple-700/30">
                              UNIQUE
                            </span>
                          )}
                          {column.hasDefault && (
                            <span className="px-1 py-0.5 rounded text-[9px] bg-green-900/30 text-green-300 border border-green-700/30">
                              DEFAULT
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error("스키마 파싱 오류:", error);
    // 파싱 실패 시 원본 텍스트 반환
    return (
      <pre className="text-xs text-gray-400 whitespace-pre-wrap">
        {schemaText}
      </pre>
    );
  }
};

// 개선된 차트 컴포넌트
const DataChart = ({ data, type = 'bar' }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-800/30 rounded-md text-gray-400 text-sm">
        차트로 표시할 데이터가 없습니다.
      </div>
    );
  }
  
  // 데이터 필드 분석
  const allKeys = Object.keys(data[0]);
  
  // 최상의 레이블 필드와 값 필드 자동 선택
  let labelField = allKeys[0];  // 기본값: 첫 번째 필드
  
  // 문자열/날짜 필드 우선 선택 (레이블용)
  allKeys.forEach(key => {
    const sampleValue = data[0][key];
    if (typeof sampleValue === 'string' || sampleValue instanceof Date) {
      if (!labelField || typeof data[0][labelField] === 'number') {
        labelField = key;
      }
    }
  });
  
  // 값 필드(숫자) 찾기
  const valueFields = allKeys.filter(key => {
    // 레이블로 선택된 필드는 제외
    if (key === labelField) return false;
    
    // 숫자인 필드만 선택
    const sampleValue = data[0][key];
    return typeof sampleValue === 'number';
  });
  
  if (valueFields.length === 0) {
    // 값 필드가 없으면 기본 pie chart를 위한 카운트 필드 추가
    if (type === 'pie') {
      // 각 레이블 값의 출현 빈도 카운트
      const counts = {};
      data.forEach(item => {
        const label = item[labelField];
        if (label in counts) {
          counts[label]++;
        } else {
          counts[label] = 1;
        }
      });
      
      // 새 데이터 포맷으로 변환
      const chartData = Object.keys(counts).map(label => ({
        [labelField]: label,
        count: counts[label]
      }));
      
      return (
        <div className="h-52 bg-gray-800/30 rounded-md border border-gray-700/50 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey={labelField}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={30}
                fill="#8884d8"
                paddingAngle={2}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                animationDuration={750}
                animationBegin={150}
                isAnimationActive={true}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}개`, '개수']}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.375rem', padding: '8px' }}
                labelStyle={{ color: '#e5e7eb', marginBottom: '4px' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend
                formatter={(value) => <span className="text-xs text-gray-300">{value}</span>}
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-40 bg-gray-800/30 rounded-md p-4 text-gray-400 text-sm">
        차트 생성을 위한 숫자 데이터가 없습니다.
      </div>
    );
  }
  
  // 차트 데이터 준비
  const chartData = data.slice(0, 20); // 최대 20개 항목으로 제한
  
  // 최적의 날짜 형식 선택 (레이블이 날짜인 경우)
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; // 유효한 날짜가 아니면 원본 반환
      
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };
  
  // 축 레이블 형식 설정
  const formatLabel = (label) => {
    if (!label) return '';
    if (typeof label === 'string' && label.length > 12) {
      return label.substring(0, 10) + '...';
    }
    return label;
  };
  
  const formatValue = (value) => {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toLocaleString('ko-KR');
      } else {
        return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
      }
    }
    return value;
  };
  
  // 차트 컨테이너 스타일 개선
  const chartContainerClass = "h-52 bg-gradient-to-b from-gray-800/40 to-gray-900/40 rounded-md border border-gray-700/50 p-4 shadow-md";
  
  // 차트 타입별 렌더링
  switch (type) {
    case 'bar':
      return (
        <div className={chartContainerClass}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey={labelField} 
                tick={{ fill: '#9ca3af', fontSize: 10 }} 
                tickFormatter={formatLabel}
                height={40}
                angle={-45}
                textAnchor="end"
                padding={{ left: 8, right: 8 }}
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} width={40} tickFormatter={formatValue} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.375rem', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value, name) => [formatValue(value), name]}
                labelFormatter={(label) => typeof label === 'string' && label.includes('T') ? formatDate(label) : label}
                labelStyle={{ color: '#e5e7eb', marginBottom: '4px' }}
                itemStyle={{ color: '#e5e7eb' }}
                cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10px', color: '#9ca3af', paddingTop: '10px' }} 
                formatter={(value) => <span className="text-xs text-gray-300">{value}</span>}
              />
              {valueFields.map((field, index) => (
                <Bar 
                  key={field} 
                  dataKey={field} 
                  name={field}
                  fill={CHART_COLORS[index % CHART_COLORS.length]} 
                  animationDuration={750}
                  animationBegin={index * 150}
                  radius={[4, 4, 0, 0]}
                  barSize={valueFields.length > 3 ? 10 : 20}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    
    case 'line':
      return (
        <div className={chartContainerClass}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey={labelField} 
                tick={{ fill: '#9ca3af', fontSize: 10 }} 
                tickFormatter={formatLabel}
                height={40}
                angle={-45}
                textAnchor="end"
                padding={{ left: 8, right: 8 }}
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} width={40} tickFormatter={formatValue} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.375rem', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value, name) => [formatValue(value), name]}
                labelFormatter={(label) => typeof label === 'string' && label.includes('T') ? formatDate(label) : label}
                labelStyle={{ color: '#e5e7eb', marginBottom: '4px' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10px', color: '#9ca3af', paddingTop: '10px' }} 
                formatter={(value) => <span className="text-xs text-gray-300">{value}</span>}
              />
              {valueFields.map((field, index) => (
                <Line 
                  key={field} 
                  type="monotone" 
                  dataKey={field} 
                  name={field}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]} 
                  strokeWidth={2}
                  activeDot={{ r: 6, stroke: '#1f2937', strokeWidth: 2, fill: CHART_COLORS[index % CHART_COLORS.length] }}
                  dot={{ r: 4, strokeWidth: 2, fill: '#1f2937' }}
                  animationDuration={1000}
                  animationBegin={index * 150}
                  isAnimationActive={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
      
    case 'pie':
      // 첫 번째 숫자 필드를 값으로 사용
      const valueField = valueFields[0];
      return (
        <div className={chartContainerClass}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey={valueField}
                nameKey={labelField}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={30}
                fill="#8884d8"
                paddingAngle={2}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                animationDuration={750}
                animationBegin={150}
                isAnimationActive={true}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.375rem', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value, name, props) => [formatValue(value), props.payload.nameKey]}
                labelStyle={{ color: '#e5e7eb', marginBottom: '4px' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend
                formatter={(value) => <span className="text-xs text-gray-300">{formatLabel(value)}</span>}
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
      
    case 'area':
      return (
        <div className={chartContainerClass}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey={labelField} 
                tick={{ fill: '#9ca3af', fontSize: 10 }} 
                tickFormatter={formatLabel}
                height={40}
                angle={-45}
                textAnchor="end"
                padding={{ left: 8, right: 8 }}
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} width={40} tickFormatter={formatValue} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.375rem', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value, name) => [formatValue(value), name]}
                labelFormatter={(label) => typeof label === 'string' && label.includes('T') ? formatDate(label) : label}
                labelStyle={{ color: '#e5e7eb', marginBottom: '4px' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10px', color: '#9ca3af', paddingTop: '10px' }} 
                formatter={(value) => <span className="text-xs text-gray-300">{value}</span>}
              />
              {valueFields.map((field, index) => (
                <Area 
                  key={field} 
                  type="monotone" 
                  dataKey={field} 
                  name={field} 
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  fillOpacity={0.4}
                  strokeWidth={2}
                  animationDuration={1000}
                  animationBegin={index * 150}
                  isAnimationActive={true}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
      
    default:
      return null;
  }
};

// 마크다운 테이블을 HTML 테이블로 변환하는 함수 개선
const markdownTableToHtml = (markdown) => {
  if (!markdown) return null;
  
  try {
    // 경고나 오류 메시지 특수 처리
    if (markdown.startsWith('⚠️') || markdown.startsWith('❌')) {
      return (
        <div className={`px-3 py-2 flex items-start gap-2 text-sm rounded-md ${
          markdown.startsWith('⚠️') 
            ? 'bg-yellow-900/20 text-yellow-300 border border-yellow-900/30' 
            : 'bg-red-900/20 text-red-300 border border-red-900/30'
        }`}>
          <FiAlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p>{markdown}</p>
        </div>
      );
    }
    
    // 마크다운 문자열이 테이블처럼 보이는지 확인
    if (!markdown.includes("|")) {
      // 일반 텍스트 또는 다른 형식이므로 그대로 반환
      return (
        <div className="px-3 py-2 text-gray-300 text-sm">
          {markdown}
        </div>
      );
    }
    
    // 줄 단위로 분리
    const rows = markdown.trim().split("\n");
    
    // 첫 번째 줄이 헤더인지 확인
    const headerRow = rows[0].trim();
    
    // 마크다운 테이블 형식 검사: 구분자 행이 있는지 확인
    let separatorRow = "";
    if (rows.length > 1) {
      separatorRow = rows[1].trim();
    }
    
    // 헤더와 구분선이 markdown 테이블 형식인지 확인
    const isMarkdownTable = headerRow.includes("|") && 
                          separatorRow && 
                          separatorRow.includes("|") && 
                          separatorRow.includes("-");
    
    if (!isMarkdownTable) {
      // 마크다운 테이블이 아닌 경우, 텍스트 형식으로 표시
      return (
        <div className="px-3 py-2 text-gray-300 text-sm">
          {markdown}
        </div>
      );
    }
    
    // 테이블 헤더 행 추출
    const headers = headerRow
      .split("|")
      .filter(cell => cell.trim().length > 0)
      .map(cell => cell.trim());
      
    if (headers.length === 0) {
      return (
        <div className="px-3 py-2 text-gray-300 text-sm">
          {markdown}
        </div>
      );
    }
    
    // 데이터 행 추출 (구분선 행 제외하고 시작)
    const dataRows = rows.slice(2);
    let validRowCount = 0;
    
    // 셀 데이터 및 타입 추출
    const tableData = [];
    
    dataRows.forEach((row, rowIdx) => {
      if (!row.includes("|")) return;
      
      const cells = row
        .split("|")
        .filter(cell => cell.trim().length > 0)
        .map(cell => cell.trim());
      
      // 빈 행이거나 셀 개수가 맞지 않는 경우 건너뛰기
      if (cells.length === 0 || cells.length !== headers.length) {
        return;
      }
      
      // 행 데이터 저장
      const rowData = {};
      cells.forEach((cell, colIdx) => {
        // 값 타입 감지 및 변환
        let value = cell;
        
        // 숫자인지 확인
        if (/^[-+]?\d+(\.\d+)?$/.test(cell.trim())) {
          value = parseFloat(cell);
        }
        // "NULL" 또는 빈 값 처리
        else if (cell.trim().toUpperCase() === "NULL" || cell.trim() === "") {
          value = null;
        }
        
        rowData[headers[colIdx]] = value;
      });
      
      tableData.push(rowData);
      validRowCount++;
    });
    
    // 유효한 행이 없는 경우 원본 텍스트 반환
    if (validRowCount === 0) {
      return (
        <div className="px-3 py-2 text-gray-300 text-sm">
          {markdown}
        </div>
      );
    }
    
    // HTML 테이블 생성
    return (
      <div className="overflow-x-auto max-w-full rounded-md">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800/80 text-left">
              {headers.map((header, idx) => (
                <th key={idx} className="px-3 py-2 text-indigo-300 font-medium text-sm">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIdx) => (
              <tr key={rowIdx} className={`${rowIdx % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'} hover:bg-gray-800/40 transition-colors`}>
                {headers.map((header, colIdx) => {
                  const value = row[header];
                  const isNumber = typeof value === 'number';
                  const isNull = value === null;
                  
                  return (
                    <td key={colIdx} className={`border-t border-gray-700/30 px-3 py-2 text-sm ${
                      isNumber 
                        ? 'text-indigo-200 text-right font-mono' 
                        : isNull 
                          ? 'text-gray-500 italic'
                          : 'text-gray-300'
                    }`}>
                      {isNull ? 'NULL' : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (error) {
    console.error("마크다운 테이블 파싱 오류:", error);
    // 에러 발생 시 원본 텍스트 표시
    return (
      <div className="px-3 py-2 text-gray-300 text-sm">
        {markdown}
      </div>
    );
  }
};

// 테이블 데이터 파서 개선
const parseTableData = (markdownTable) => {
  if (!markdownTable) return null;
  
  try {
    // 경고나 오류 메시지는 파싱 불가
    if (markdownTable.startsWith('⚠️') || markdownTable.startsWith('❌')) {
      return null;
    }
    
    // 마크다운 테이블이 아닌 경우 빈 배열 반환
    if (!markdownTable.includes('|')) {
      return null;
    }
    
    const rows = markdownTable.trim().split('\n');
    if (rows.length < 3) {
      return null;
    }
    
    // 헤더 행과 구분자 행 확인
    const headerRow = rows[0].trim();
    const separatorRow = rows[1].trim();
    
    if (!headerRow.includes('|') || !separatorRow.includes('|') || !separatorRow.includes('-')) {
      return null;
    }
    
    // 헤더 추출
    const headers = headerRow
      .split('|')
      .filter(cell => cell.trim().length > 0)
      .map(cell => cell.trim());
    
    if (headers.length === 0) {
      return null;
    }
    
    // 데이터 행 추출 (구분선 행 제외)
    const dataRows = rows.slice(2);
    const data = [];
    
    dataRows.forEach(row => {
      if (!row.includes('|')) return;
      
      const cells = row
        .split('|')
        .filter(cell => cell.trim().length > 0)
        .map(cell => cell.trim());
      
      // 빈 행이거나 셀 개수가 맞지 않는 경우 건너뛰기
      if (cells.length === 0 || cells.length !== headers.length) {
        return;
      }
      
      // 객체로 변환
      const rowObj = {};
      headers.forEach((header, index) => {
        const cell = cells[index] || '';
        
        let value = cell;
        
        // 값 타입 감지
        if (cell.trim().toUpperCase() === 'NULL' || cell.trim() === '') {
          value = null;
        }
        // 숫자 판별 및 변환
        else if (/^[-+]?\d+(\.\d+)?$/.test(cell.trim())) {
          const numValue = parseFloat(cell);
          if (!isNaN(numValue)) {
            value = numValue; // 숫자로 변환
          }
        }
        // 날짜 판별 및 변환
        else if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(cell.trim())) {
          try {
            const date = new Date(cell);
            if (!isNaN(date.getTime())) {
              value = date; // 날짜로 변환
            }
          } catch (e) {
            // 변환 실패 시 원본 문자열 사용
          }
        }
        
        rowObj[header] = value;
      });
      
      data.push(rowObj);
    });
    
    return data;
  } catch (error) {
    console.error('테이블 데이터 파싱 오류:', error);
    return null;
  }
};

// 테이블 데이터가 차트로 표시 가능한지 확인하는 함수 추가
const isDataChartable = (data) => {
  // 데이터가 비어있거나 유효하지 않은 경우
  if (!data || !Array.isArray(data) || data.length === 0) {
    return false;
  }
  
  // 최소 1개 이상의 레코드가 필요
  if (data.length < 1) {
    return false;
  }
  
  // 키가 2개 이상 있어야 함 (카테고리와 값)
  const keys = Object.keys(data[0]);
  if (keys.length < 2) {
    return false;
  }
  
  // 최소 하나의 숫자 필드가 있는지 확인
  const hasNumericField = keys.some(key => {
    // 첫 번째 값이 숫자인지 확인
    const firstValue = data[0][key];
    return typeof firstValue === 'number' && !isNaN(firstValue);
  });
  
  return hasNumericField;
};

// 메시지 버블 컴포넌트
const MessageBubble = ({ type, content, timestamp, sql, result, onViewChart = () => {} }) => {
  const isUser = type === 'user';
  const messageTime = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const [showSql, setShowSql] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  // SQL 결과에서 테이블 데이터 파싱
  const tableData = useMemo(() => {
    if (result) {
      return parseTableData(result);
    }
    return null;
  }, [result]);
  
  // 차트 표시 가능 여부
  const canShowChart = useMemo(() => {
    return tableData && tableData.length > 0;
  }, [tableData]);
  
  // 컴포넌트 마운트 시 애니메이션 효과
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
      style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}
    >
      <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* 아바타 */}
        <div className={`flex-shrink-0 rounded-full w-8 h-8 flex items-center justify-center ${
          isUser 
            ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-md' 
            : 'bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-700/50'
        }`}>
          {isUser ? <FiUser size={14} className="text-white" /> : <FiTerminal size={14} className="text-indigo-300" />}
        </div>
        
        {/* 메시지 내용 */}
        <div>
          <div className={`rounded-2xl px-4 py-3 ${
            isUser 
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md' 
              : 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 text-gray-200'
          }`}>
            {content}
          </div>
          
          {/* SQL 및 결과 영역 (어시스턴트 메시지만 해당) */}
          {!isUser && sql && (
            <div className="mt-2 bg-gray-850 border border-gray-700/40 rounded-lg overflow-hidden shadow-md">
              {/* 탭 버튼 */}
              <div className="flex border-b border-gray-700/50">
                <button 
                  onClick={() => {
                    setShowSql(!showSql);
                    if (showResult && !showSql) setShowResult(false);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 ${
                    showSql 
                      ? 'bg-gradient-to-r from-indigo-600/70 to-indigo-700/70 text-white' 
                      : 'bg-gray-800/50 hover:bg-gray-700/60 text-gray-300'
                  } transition-colors`}
                  title="SQL 쿼리 보기"
                >
                  <FiCode size={14} />
                  <span className="text-xs font-medium">SQL</span>
                </button>
                
                <button 
                  onClick={() => {
                    setShowResult(!showResult);
                    if (showSql && !showResult) setShowSql(false);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 ${
                    showResult 
                      ? 'bg-gradient-to-r from-indigo-600/70 to-indigo-700/70 text-white' 
                      : 'bg-gray-800/50 hover:bg-gray-700/60 text-gray-300'
                  } transition-colors`}
                  title="쿼리 결과 보기"
                >
                  <FiList size={14} />
                  <span className="text-xs font-medium">결과</span>
                </button>
                
                {canShowChart && (
                  <button 
                    onClick={() => {
                      onViewChart();
                      setShowSql(false);
                      setShowResult(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/60 text-gray-300 hover:text-white transition-colors ml-auto"
                    title="차트로 시각화"
                  >
                    <FiBarChart2 size={14} />
                    <span className="text-xs font-medium">차트</span>
                  </button>
                )}
              </div>
              
              {/* SQL 코드 */}
              {showSql && (
                <div className="overflow-x-auto max-w-full">
                  <SyntaxHighlighter
                    language="sql"
                    style={vs2015}
                    wrapLines={true}
                    wrapLongLines={true}
                    showLineNumbers={false}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      background: 'transparent',
                      fontSize: '0.8rem',
                      borderRadius: '0',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-all',
                      width: '100%',
                      maxWidth: '100%',
                      overflow: 'hidden'
                    }}
                    codeTagProps={{
                      style: {
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-all',
                        display: 'block',
                        width: '100%'
                      }
                    }}
                  >
                    {sql}
                  </SyntaxHighlighter>
                </div>
              )}
              
              {/* 결과 */}
              {showResult && (
                <div className="overflow-x-auto max-h-96">
                  {result ? markdownTableToHtml(result) : <div className="p-3 text-gray-400 text-sm">결과가 없습니다.</div>}
                </div>
              )}
            </div>
          )}
          
          {/* 타임스탬프 */}
          <div className={`mt-1 text-[10px] text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
            {messageTime}
          </div>
        </div>
      </div>
    </div>
  );
};

// 확인 모달 컴포넌트 - 파일 상단으로 이동
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/70">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

// 예시 질문 데이터 (카테고리별로 구성)
const exampleQuestions = [
  {
    category: '기본 조회',
    questions: [
      "사용자 테이블에서 모든 사용자의 이름과 이메일을 보여줘",
      "부서 정보를 모두 조회해줘",
      "오늘 등록된 주문 목록을 보여줘"
    ]
  },
  {
    category: '집계/통계',
    questions: [
      "최근 일주일간 등록된 사용자 수는?", 
      "각 부서별 평균 급여가 얼마인지 알려줘",
      "월별 주문 건수와 총액을 보여줘"
    ]
  },
  {
    category: '필터링',
    questions: [
      "게시글이 10개 이상인 사용자만 조회해줘",
      "서울에 사는 고객 중 구매액이 10만원 이상인 사람 목록",
      "미결제 상태인 주문 건수가 가장 많은 고객 5명은?"
    ]
  },
  {
    category: '정렬/제한',
    questions: [
      "방문 횟수가 가장 많은 고객 10명을 보여줘",
      "가장 최근에 등록된 상품 5개는?",
      "주문 금액이 큰 순서대로 거래 내역을 정렬해줘"
    ]
  }
];

// 단순 예시 질문 목록 (기존 구현 방식 대체)
const flatExampleQuestions = exampleQuestions.flatMap(category => category.questions);

// 예시 질문 목록 수정 - 한국어 질문 추가
const EXAMPLE_QUESTIONS = [
 // "매출이 가장 높은 상위 5개 제품은 무엇인가요?",
 // "지난 달에 가장 많이 주문한 고객 3명을 보여주세요",
 // "카테고리별 판매량을 내림차순으로 정렬해서 보여주세요",
  "평균 주문 금액이 50,000원 이상인 고객 목록을 보여주세요",
  "리뷰 평점이 4.5 이상인 제품의 수는 몇 개인가요?",
  "각 사용자별 총 자원 사용량을 내림차순으로 보여주세요",
  "최근 30일 내에 등록된 문의사항 개수는 몇 개인가요?",
  "가상머신 사용량이 90% 이상인 사용자 리스트를 보여주세요"
];

// LLM 응답에서 반복적인 Markdown 섹션을 제거하는 함수
const deduplicateMarkdownSections = (markdownText) => {
  if (!markdownText || typeof markdownText !== 'string') {
    return "";
  }

  // 섹션을 구분하는 주요 패턴: "## "으로 시작하는 Markdown 헤더 (H2)
  // 또는 ```markdown\n## 답변 패턴 등을 고려할 수 있으나,
  // 현재 제공된 예시에서는 "## 답변"이 주요 반복 단서이므로 이를 기준으로 함.
  // 좀 더 일반적인 헤더(H1-H3)를 고려: /^(#{1,3}\s+.+?)(?=\n#{1,3}\s+|$)/gms
  // 여기서는 사용자의 예시를 기반으로 "## 답변"을 포함하는 더 넓은 패턴을 사용.
  // 응답 시작부터 첫 "## 답변" 앞까지, 그리고 각 "## 답변" 블록으로 나눔.
  
  const sections = [];
  const uniqueNormalizedSections = new Set();
  let result = "";

  // 정규 표현식으로 "## 답변" 또는 유사한 헤더로 시작하는 블록을 찾음
  // (?:^|\n)##\s+.*?(?=\n##\s+|\n```markdown\n##\s+|$)
  // 위 정규식은 복잡하므로, 단순화된 접근으로 문자열 분할을 사용.
  // "## 답변"이라는 문자열이 내용에 포함될 수 있으므로 주의해야 함.
  // 여기서는 제공된 예시의 반복 구조 ` ```markdown ## 답변 ... ``` ` 및 `## 답변 ...` 에 초점.

  // 더 안정적인 방법: 응답을 줄 단위로 처리하거나,
  // 명확한 구분자(예: \n---\n과 같은 LLM이 잘 사용하지 않는 구분자)를 가정.
  // 여기서는 "## 답변"을 기준으로 단순화된 중복 제거를 시도.
  // 실제로는 LLM 응답 포맷에 따라 정교한 파싱이 필요할 수 있음.

  // 임시 해결책: 가장 지배적인 반복 패턴인 "## 답변"으로 시작하는 주요 내용 블록의 중복을 제거.
  // 이를 위해, 전체 텍스트를 "## 답변"으로 분리하고, 각 조각의 유사성을 비교.
  const separator = "## 답변";
  const parts = markdownText.split(new RegExp(`(\\n${separator}\\s|${separator}\\s)`, 'g'));
  
  let currentSection = "";
  if (parts.length > 0) {
    currentSection = parts[0]; // 첫 부분은 ## 답변 이전 내용일 수 있음.
  }

  for (let i = 1; i < parts.length; i++) {
    // 분리자로 인해 생긴 빈 문자열이나, 분리자 자체를 건너뛰기 위한 로직.
    // 분리 패턴에 따라 parts[i]가 분리자일수도 있고, 내용일 수도 있음.
    // 여기서는 split 결과가 [내용, 분리자, 내용, 분리자, ...] 형태임을 가정
    if (parts[i].trim() === "" || parts[i].includes(separator)) {
        // 현재까지 구성된 currentSection을 하나의 섹션으로 처리
        const normalizedSection = currentSection.trim().replace(/\s+/g, ' ');
        if (normalizedSection !== "" && !uniqueNormalizedSections.has(normalizedSection)) {
            uniqueNormalizedSections.add(normalizedSection);
            result += currentSection;
        }
        currentSection = ""; // 다음 섹션을 위해 초기화

        if (parts[i].includes(separator)) { // 현재 부분이 분리자라면 추가
            currentSection += parts[i]; 
        }

    } else { // 분리자가 아닌 내용 부분
        currentSection += parts[i];
    }
  }

  // 마지막 남은 섹션 처리
  const normalizedLastSection = currentSection.trim().replace(/\s+/g, ' ');
  if (normalizedLastSection !== "" && !uniqueNormalizedSections.has(normalizedLastSection)) {
      result += currentSection;
  } else if (result === "" && currentSection.trim() !== "") {
    // 중복이지만 결과가 비어있으면 (즉, 모든 내용이 중복이면) 첫번째 것은 표시
    result += currentSection;
  }
  
  // 만약 분할 및 재조립 로직이 복잡하여 문제가 생긴다면,
  // 가장 간단하게는 전체 응답에서 첫번째 "## 답변" 블록과 두번째 "## 답변" 블록의 내용을 비교하여
  // 동일하면 두번째 이후를 제거하는 방식을 고려할 수 있습니다.
  // 아래는 더 견고하지만 복잡한 접근 대신, "매우 유사한 긴 문단"을 찾아 제거하는 방식.

  // 사용자 제공 예시의 반복은 주로 전체 내용의 복제에 가까움.
  // 따라서, 전체 응답에서 매우 유사한(또는 동일한) 긴 문단/섹션이 연속으로 나타나는지 확인.
  // 아래는 임시적이고 단순화된 접근입니다. 실제 LLM 응답 패턴에 따라 고도화 필요.
  // 이 코드는 개념 증명이며, 실제 환경에서는 LLM 응답 구조에 맞춰 더욱 정교하게 다듬어야 합니다.

  // 더 간단한 접근: 특정 마커 ("## 답변")를 기준으로 내용을 분리하고, Set으로 중복 제거
  const uniqueContents = new Set();
  let finalContent = "";
  const contentBlocks = markdownText.split(/(?=^##\s+답변)/m); // "## 답변" 헤더로 시작하는 부분으로 분리

  for (const block of contentBlocks) {
    const trimmedBlock = block.trim();
    if (trimmedBlock === "") continue;

    // 블록 내용을 정규화 (공백, 줄바꿈 등)
    const normalizedBlock = trimmedBlock.replace(/\s+/g, ' ').toLowerCase();
    
    if (!uniqueContents.has(normalizedBlock)) {
      uniqueContents.add(normalizedBlock);
      finalContent += block; // 원본 블록 추가 (포맷 유지)
    }
  }
  
  // 만약 분리된 블록이 없다면 (즉, "## 답변" 헤더가 없다면) 원본 텍스트 반환
  if (contentBlocks.length <= 1 && markdownText.trim() !== "") {
      return markdownText;
  }

  return finalContent.trim() === "" ? markdownText : finalContent; // 최종 결과가 비어있으면 원본 반환
};

const SQLQueryPage = ({ setMode }) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [dbSchema, setDbSchema] = useState(null);
  const [showSchema, setShowSchema] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sql'); // 기본값은 SQL 생성 모드
  const [tableData, setTableData] = useState(null);
  
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // 메시지 끝으로 스크롤
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      console.log("메시지 끝으로 스크롤");
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };
  
  // 메시지 추가 시 스크롤
  useEffect(() => {
    if (chatMessages.length > 0) {
      console.log("메시지 변경 감지, 스크롤 예약");
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [chatMessages]);
  
  // 초기 로딩 시 DB 스키마 정보 가져오기
  useEffect(() => {
    const fetchDbSchema = async () => {
      try {
        // 상대 경로로 변경 (vite 프록시 사용)
        const response = await fetch('/api/db-schema');
        if (!response.ok) {
          const text = await response.text();
          console.error('스키마 로딩 실패 응답:', text);
          throw new Error(`스키마 로딩 실패: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 응답 형식 변경에 따른 처리 추가
        if (data.status === 'error') {
          console.error('DB 스키마 로딩 오류:', data.error);
          setErrorMessage('데이터베이스 스키마를 불러올 수 없습니다.');
          // 오류가 있어도 schema 필드에 메시지가 들어있으면 표시
          if (data.schema) {
            setDbSchema(data.schema);
          }
        } else {
          setDbSchema(data.schema || '스키마 정보가 없습니다.');
        }
      } catch (error) {
        console.error('DB 스키마 로딩 오류:', error);
        setErrorMessage('데이터베이스 스키마를 불러올 수 없습니다.');
      }
    };
    
    // 쿼리 히스토리 로드
    const loadQueryHistory = () => {
      const savedHistory = localStorage.getItem('sql_query_history');
      if (savedHistory) {
        try {
          setQueryHistory(JSON.parse(savedHistory));
        } catch (error) {
          console.error('쿼리 히스토리 로딩 오류:', error);
          localStorage.removeItem('sql_query_history');
        }
      }
    };
    
    fetchDbSchema();
    loadQueryHistory();
  }, []);
  
  // 히스토리에 쿼리 추가
  const addToHistory = (question, sql, result) => {
    const newHistoryItem = {
      id: Date.now(),
      question,
      sql,
      result,
      timestamp: new Date().getTime()
    };
    
    const updatedHistory = [newHistoryItem, ...queryHistory].slice(0, 20); // 최대 20개 유지
    setQueryHistory(updatedHistory);
    localStorage.setItem('sql_query_history', JSON.stringify(updatedHistory));
  };
  
  // 히스토리에서 쿼리 불러오기
  const loadFromHistory = (historyItem) => {
    setQuestion(historyItem.question);
    setChatMessages(prev => [
      ...prev,
      {
        type: 'assistant',
        content: '아래는 요청하신 SQL 쿼리입니다:',
        sql: historyItem.sql,
        result: historyItem.result,
        timestamp: historyItem.timestamp
      }
    ]);
    setShowHistory(true);
  };
  
  // 예시 질문 클릭 핸들러
  const handleExampleClick = (exampleQuestion) => {
    setQuestion(exampleQuestion);
    // 상태 업데이트 후 즉시 함수를 호출하면 이전 상태 값이 사용될 수 있으므로
    // 직접 파라미터를 전달하는 방식으로 변경합니다.
    if (activeTab === 'sql') {
      // SQL 생성 모드일 경우 바로 쿼리 제출
      const event = new Event('submit');
      event.preventDefault = () => {}; // 가상 이벤트 객체 생성
      
      // 질문 값을 직접 사용하여 API 호출
      submitSqlQuery(exampleQuestion, event);
    } else {
      // AI 응답 모드일 경우 LLM 응답 생성
      submitSqlLlmQuery(exampleQuestion);
    }
  };
  
  // SQL 쿼리 제출 함수 개선
  const submitSqlQuery = async (questionText, e) => {
    if (e) e.preventDefault();
    
    const queryText = questionText || question;
    if (!queryText.trim() || isLoading) return;
    
    try {
      // 사용자 질문 UI에 추가
      const newUserMessage = {
        type: 'user',
        content: queryText,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, newUserMessage]);
      setIsLoading(true);
      setErrorMessage('');
      
      // SQL 변환 API 호출 (타임아웃 설정 추가)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60초 타임아웃
      
      const response = await fetch('/api/sql-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: queryText }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // 타임아웃 해제
      
      if (!response.ok) {
        throw new Error('API 요청 실패');
      }
      
      const result = await response.json();
      
      // 히스토리에 추가
      if (result.sql) {
        addToHistory(queryText, result.sql, result.results);
      }
      
      // 응답 메시지 추가
      const isError = result.results && result.results.includes('❌');
      const isEmpty = result.results && result.results.includes('⚠️');
      
      let responseContent = '';
      
      if (isError) {
        responseContent = '쿼리 실행 중 오류가 발생했습니다. SQL 문법을 확인해주세요.';
      } else if (isEmpty) {
        responseContent = '조건에 맞는 데이터를 찾을 수 없습니다.';
      } else {
        responseContent = '쿼리 결과입니다:';
      }
      
      const newAssistantMessage = {
        type: 'assistant',
        content: responseContent,
        sql: result.sql,
        result: result.results,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, newAssistantMessage]);
      // 파라미터로 전달된 질문이 아닌 경우에만 입력창 초기화
      if (!questionText) {
        setQuestion('');
      }
      
      // 결과에서 테이블 데이터 파싱 (차트 준비)
      if (result.results && !isError && !isEmpty) {
        const parsedData = parseTableData(result.results);
        setTableData(parsedData);
      }
      
    } catch (error) {
      console.error('SQL 변환 오류:', error);
      // 타임아웃 오류인지 확인
      if (error.name === 'AbortError') {
        setErrorMessage('요청 시간이 초과되었습니다. 서버 응답이 지연되고 있습니다.');
      } else {
        setErrorMessage('SQL 변환 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };
  
  // SQL + LLM 쿼리 제출 함수 개선
  const submitSqlLlmQuery = async (questionText) => {
    const queryText = questionText || question;
    if (!queryText.trim() || isLoading) return;
    
    try {
      // 사용자 질문 UI에 추가
      const newUserMessage = {
        type: 'user',
        content: queryText,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, newUserMessage]);
      setIsLoading(true);
      setErrorMessage('');
      
      // 타임아웃 설정 추가
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90초 타임아웃 (LLM은 더 길게)
      
      // SQL + LLM 응답 생성 API 호출
      const response = await fetch('/api/sql-and-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: queryText }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // 타임아웃 해제
      
      if (!response.ok) {
        throw new Error('API 요청 실패');
      }
      
      const result = await response.json();
      
      // 필드 이름 매핑 - 백엔드 응답 필드와 프론트엔드 기대 필드 매핑
      const sql = result.sql || result.sql_query || "";
      const results = result.results || result.sql_result || "";
      const explanation = result.explanation || result.bot_response || "";
      
      // 히스토리에 추가
      if (sql) {
        addToHistory(queryText, sql, results);
      }
      
      // 응답 메시지 추가
      const isError = results && results.includes('❌');
      const isEmpty = results && results.includes('⚠️');
      
      // 오류나 빈 결과가 아니라면 응답 그대로 표시, 아니면 상태에 맞는 보조 메시지 추가
      let finalContent = explanation;
      
      if (!explanation || explanation.length < 5) {
        if (isError) {
          finalContent = '쿼리 실행 중 오류가 발생했습니다. SQL 문법을 확인해주세요.';
        } else if (isEmpty) {
          finalContent = '조건에 맞는 데이터를 찾을 수 없습니다.';
        } else {
          finalContent = '쿼리 결과입니다:';
        }
      }
      
      const newAssistantMessage = {
        type: 'assistant',
        content: finalContent,
        sql: sql,
        result: results,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, newAssistantMessage]);
      // 파라미터로 전달된 질문이 아닌 경우에만 입력창 초기화
      if (!questionText) {
        setQuestion('');
      }
      
      // 결과가 테이블 형식이고 오류가 없는 경우 차트 데이터 준비
      if (results && !isError && !isEmpty) {
        try {
          const parsedData = parseTableData(results);
          setTableData(parsedData);
          // 차트 가능 여부 확인 - 클래스 변수로 setCanShowChart 대신 직접 showChart 값 변경
          const isChartable = isDataChartable(parsedData);
          setShowChart(isChartable); // setCanShowChart는 존재하지 않으므로 setShowChart 사용
        } catch (parseError) {
          console.error('테이블 데이터 파싱 오류:', parseError);
          setShowChart(false); // setCanShowChart 대신 setShowChart 사용
        }
      } else {
        setShowChart(false); // setCanShowChart 대신 setShowChart 사용
      }
      
    } catch (error) {
      console.error('SQL+LLM 변환 오류:', error);
      // 타임아웃 오류인지 확인
      if (error.name === 'AbortError') {
        setErrorMessage('요청 시간이 초과되었습니다. LLM 응답 생성이 지연되고 있습니다.');
      } else {
        setErrorMessage('SQL+LLM 변환 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };
  
  // API 호출 함수 - SQL 변환만 요청 (폼 제출용 핸들러)
  const handleSubmit = (e) => {
    submitSqlQuery(null, e);
  };
  
  // API 호출 함수 - SQL 변환 + LLM 설명 요청 (폼 제출용 핸들러)
  const handleSqlLlmQuery = (e) => {
    // 이벤트 객체가 존재하면 기본 동작 방지
    if (e) {
      e.preventDefault();
    }
    submitSqlLlmQuery();
  };
  
  // 차트 보기 핸들러
  const handleViewChart = () => {
    // tableData가 없거나 결과가 없을 때
    if (!tableData) {
      // 마지막 어시스턴트 메시지 찾기
      const lastAssistantMsg = [...chatMessages].reverse().find(
        msg => msg.type === 'assistant' && msg.result
      );
      
      // 마지막 메시지에서 테이블 데이터 파싱
      if (lastAssistantMsg && lastAssistantMsg.result) {
        const parsedData = parseTableData(lastAssistantMsg.result);
        
        if (parsedData && parsedData.length > 0) {
          // 유효한 데이터가 있으면 설정
          setTableData(parsedData);
          setShowChart(true);
          return;
        }
      }
      
      // 유효한 데이터가 없으면 오류 메시지 표시
      setErrorMessage('차트로 표시할 수 있는 데이터가 없습니다. 먼저 데이터를 쿼리해주세요.');
      setTimeout(() => setErrorMessage(''), 3000);
    } else {
      // 테이블 데이터가 있으면 차트 표시
      setShowChart(true);
    }
  };
  
  // 날짜 포맷 함수
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // AI 응답 탭 전환 로직 수정
  const handleTabChange = (tab) => {
    // 이미 같은 탭이면 변경하지 않음
    if (activeTab === tab) return;
    
    // 탭 변경
    setActiveTab(tab);
    
    // 새 탭이 'sql'이면, 기존 작성 중인 내용 유지
    // 'ai'로 변경 시 이전 상태 유지
    console.log(`탭 변경: ${activeTab} -> ${tab}`);
  };

  // 한국어 메시지 업데이트
  const placeholderText = activeTab === 'sql' 
    ? '자연어로 질문을 입력하세요. 예: "최근 주문 5건을 보여줘"' 
    : '자연어로 질문을 입력하세요. 예: "지난 달 주문 통계를 분석해줘"';

  // 모드 전환 토글 컴포넌트
  const ModeToggleSwitch = () => {
    // 현재 모드 (SQL 페이지에서는 항상 'sql'이 활성화)
    const mode = 'sql'; 
    
    // 모드 전환 핸들러
    const handleToggleMode = (newMode) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 같은 모드 클릭 시 무시
      if (newMode === mode) return;
      
      try {
        // 모드 전환 함수 호출
        if (typeof setMode === 'function') {
          setMode(newMode);
          console.log(`${newMode} 모드로 전환 함수 호출`);
        
          // 버튼 효과
        const button = e.currentTarget;
          button.classList.add('scale-95');
        setTimeout(() => {
            button.classList.remove('scale-95');
        }, 200);
        }
      } catch (err) {
        console.error('모드 전환 중 오류 발생:', err);
      }
    };

    return (
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-20">
        <div className="bg-gray-800/90 backdrop-blur-md rounded-full p-2 shadow-lg border border-gray-700/50 flex flex-col gap-3">
          {/* 배경 효과 - 활성화된 모드에 따라 움직임 */}
          <div className="absolute inset-x-1.5 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 filter blur-sm transition-all duration-300 ease-in-out pointer-events-none" 
               style={{ 
                 top: mode === 'chat' ? '0.4rem' : mode === 'sql' ? '2.9rem' : '5.4rem',
                 opacity: 0.7
               }}>
          </div>
          
          {/* 챗봇 모드 버튼 */}
          <button 
            onClick={handleToggleMode('chat')}
            className={`relative transition-all duration-300 w-8 h-8 rounded-full flex items-center justify-center ${
              mode === 'chat' 
                ? 'bg-gradient-to-br from-blue-500/80 to-indigo-600/80 text-white shadow-md shadow-blue-500/20' 
                : 'bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
            }`}
            title="챗봇 모드로 전환"
            data-testid="chat-mode-toggle"
          >
            {/* 활성화 효과 - 고리 애니메이션 */}
            {mode === 'chat' && (
              <>
                <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-ping opacity-30"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/5 to-indigo-600/5 animate-pulse"></div>
              </>
            )}
            
            <FiMessageCircle size={14} className="transition-all duration-300" />
          </button>
          
          {/* SQL 모드 버튼 */}
          <button 
            onClick={handleToggleMode('sql')}
            className={`relative transition-all duration-300 w-8 h-8 rounded-full flex items-center justify-center ${
              mode === 'sql' 
                ? 'bg-gradient-to-br from-indigo-500/80 to-purple-600/80 text-white shadow-md shadow-indigo-500/20' 
                : 'bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
            }`}
            title="SQL 질의 모드로 전환"
            data-testid="sql-mode-toggle"
          >
            {/* 활성화 효과 - 고리 애니메이션 */}
            {mode === 'sql' && (
              <>
                <div className="absolute inset-0 rounded-full border border-indigo-400/30 animate-ping opacity-30"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-600/5 animate-pulse"></div>
              </>
            )}
            
            <FiDatabase size={14} className="transition-all duration-300" />
          </button>
          
          {/* 대시보드 모드 버튼 추가 */}
          <button 
            onClick={handleToggleMode('dashboard')}
            className={`relative transition-all duration-300 w-8 h-8 rounded-full flex items-center justify-center ${
              mode === 'dashboard' 
                ? 'bg-gradient-to-br from-emerald-500/80 to-teal-600/80 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
            }`}
            title="대시보드 모드로 전환"
            data-testid="dashboard-mode-toggle"
          >
            {/* 활성화 효과 - 고리 애니메이션 */}
            {mode === 'dashboard' && (
              <>
                <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping opacity-30"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-600/5 animate-pulse"></div>
              </>
            )}
            
            <FiBarChart2 size={14} className="transition-all duration-300" />
          </button>
        </div>
      </div>
    );
  };
  
  // 빈 채팅 화면 워터마크 컴포넌트
  const EmptySQLQueryWatermark = () => {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center justify-center max-w-2xl px-6 py-8 text-center">
          {/* 물결 애니메이션 배경 효과 */}
          <div className="absolute inset-0 overflow-hidden opacity-10">
            <div className="absolute inset-x-0 top-1/4 w-full h-64 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 rounded-full filter blur-3xl transform -translate-y-20 scale-150 animate-pulse" style={{ animationDuration: '8s' }}></div>
            <div className="absolute inset-x-0 top-1/3 w-full h-64 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 rounded-full filter blur-3xl transform translate-y-16 scale-125 animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }}></div>
          </div>
          
          {/* 아이콘 컨테이너 - 퍼지는 링 효과 */}
          <div className="relative mb-8">
            <div className="absolute -inset-0 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-600/20 animate-ping opacity-30" style={{ animationDuration: '3s' }}></div>
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-600/10 animate-ping opacity-20" style={{ animationDuration: '3.5s' }}></div>
            <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-indigo-500/5 to-purple-600/5 animate-ping opacity-10" style={{ animationDuration: '4s' }}></div>
            
            <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/30 to-purple-600/30 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 bg-gray-900/80 rounded-full flex items-center justify-center ring-2 ring-indigo-500/30">
                  <FiDatabase className="text-indigo-400 animate-pulse" style={{ animationDuration: '2s' }} size={30} />
                </div>
              </div>
            </div>
          </div>
          
          {/* 텍스트 영역 - 부드러운 페이드인 애니메이션 */}
          <div className="space-y-4 animate-fade-in-up">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-300 mb-2">
              SQL 질의 어시스턴트
            </h2>
            <p className="text-base text-gray-400 mb-6 max-w-lg leading-relaxed">
              자연어로 질문하면 SQL 쿼리를 만들어 데이터를 검색해 드립니다. <br />아래 입력창에 원하시는 질문을 입력해 보세요.
            </p>
          </div>
          
          {/* 기능 설명 카드 영역 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md text-left mt-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-start p-3 rounded-lg bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/60 hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex-shrink-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 p-2 rounded-md mr-3">
                <FiSearch className="text-indigo-400" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-200">쿼리 생성</h3>
                <p className="text-xs text-gray-500 mt-1">자연어를 SQL로 자동 변환</p>
              </div>
            </div>
            
            <div className="flex items-start p-3 rounded-lg bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/60 hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex-shrink-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 p-2 rounded-md mr-3">
                <FiBarChart2 className="text-indigo-400" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-200">데이터 시각화</h3>
                <p className="text-xs text-gray-500 mt-1">쿼리 결과를 차트로 표시</p>
              </div>
            </div>
            
            <div className="flex items-start p-3 rounded-lg bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/60 hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex-shrink-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 p-2 rounded-md mr-3">
                <FiZap className="text-indigo-400" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-200">AI 설명</h3>
                <p className="text-xs text-gray-500 mt-1">쿼리와 결과에 대한 해석 제공</p>
              </div>
            </div>
            
            <div className="flex items-start p-3 rounded-lg bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/60 hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex-shrink-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 p-2 rounded-md mr-3">
                <FiTable className="text-indigo-400" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-200">스키마 탐색</h3>
                <p className="text-xs text-gray-500 mt-1">DB 구조를 쉽게 확인</p>
              </div>
            </div>
          </div>
          
          {/* 시작 도움말 - 하단 안내 문구 */}
          <div className="mt-10 flex items-center text-gray-500 text-sm animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <FiCornerDownRight className="mr-2 text-indigo-400" size={16} />
            <span>입력창에 질문을 입력하면 워터마크가 사라지고 SQL 생성이 시작됩니다</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-900 text-gray-200">
      {/* 헤더 - 디자인 통일 */}
      <div className="h-16 flex items-center justify-between px-6 bg-gray-900 border-b border-gray-800 shadow-sm z-10">
        {/* 좌측: 타이틀 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <FiDatabase size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              SQL 질의 어시스턴트
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">자연어로 데이터베이스를 쉽게 검색하세요</p>
          </div>
        </div>
        
        {/* 우측: 기능 버튼 */}
        <div className="flex items-center gap-2">
          {/* 스키마 토글 버튼 */}
          <button
            onClick={() => setShowSchema(!showSchema)}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              showSchema ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="DB 스키마 보기"
          >
            <FiTable size={16} />
            <span>스키마</span>
          </button>
          
          {/* 히스토리 토글 버튼 */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              showHistory ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="쿼리 히스토리 보기"
          >
            <FiClock size={16} />
            <span>히스토리</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* 히스토리 사이드바 - 디자인 통일 */}
        {showHistory && (
          <div className="w-full md:w-64 h-64 md:h-auto border-b md:border-b-0 md:border-r border-gray-800/70 bg-gray-900/30 md:flex-shrink-0 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800/50 bg-gray-900/40 backdrop-blur-sm sticky top-0 z-10">
              <h3 className="text-sm font-medium text-white flex items-center gap-1.5">
                <FiClock size={14} className="text-indigo-400" />
                <span>쿼리 히스토리</span>
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto px-2 py-3">
              {queryHistory.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  <FiMessageCircle size={24} className="mx-auto mb-2 opacity-50" />
                  <p>쿼리 히스토리가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queryHistory.map(item => (
                    <button
                      key={item.id}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-800/70 transition-colors group border border-gray-800/50 hover:border-indigo-500/30"
                      onClick={() => loadFromHistory(item)}
                    >
                      <div className="text-xs text-indigo-400 mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <FiMessageSquare size={10} />
                          <span>질문</span>
                        </div>
                        <span className="text-gray-500">{formatDate(item.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-300 truncate">{item.question}</p>
                      
                      {item.sql && (
                        <div className="mt-1.5 text-[10px] text-gray-400 bg-gray-800/50 px-2 py-1 rounded truncate group-hover:text-gray-300">
                          {item.sql.length > 40 ? item.sql.substring(0, 40) + '...' : item.sql}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {queryHistory.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-800/50 bg-gray-900/40 backdrop-blur-sm">
                <button
                  className="w-full text-xs text-gray-400 hover:text-gray-300 py-1.5 px-3 bg-gray-800/70 hover:bg-red-900/30 hover:border-red-800/50 border border-gray-700/30 rounded-md transition-colors flex items-center justify-center gap-1.5"
                  onClick={() => setIsConfirmModalOpen(true)}
                >
                  <FiTrash2 size={12} />
                  <span>히스토리 비우기</span>
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* 메인 영역 - 디자인 통일 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 예시 질문 영역에서 카테고리 버튼들 제거 - 이 부분을 수정합니다 */}
          <div className="bg-gray-900/40 px-4 py-2">
            {/* 드롭다운 메뉴 방식으로 변경 */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* 선택된 질문만 남기고 표시 */}
              {EXAMPLE_QUESTIONS.slice(0, 5).map((question, idx) => (
                        <button
                          key={idx}
                          type="button"
                  onClick={() => handleExampleClick(question)}
                  className="text-xs px-3 py-1.5 bg-gray-800/70 hover:bg-indigo-600/40 border border-gray-700/30 hover:border-indigo-500/40 rounded-md text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
                        >
                  <FiHelpCircle size={12} className="text-indigo-400" />
                  <span className="line-clamp-1">
                    {question.length > 25 ? question.substring(0, 22) + '...' : question}
                  </span>
                        </button>
              ))}
              
              {/* 마지막으로 사용한 질문 표시 */}
              {chatMessages.length > 0 && chatMessages[chatMessages.length - 2]?.type === 'user' && (
                <button
                  type="button"
                  onClick={() => handleExampleClick(chatMessages[chatMessages.length - 2].content)}
                  className="text-xs px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 rounded-md text-indigo-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <FiClock size={12} className="text-indigo-400" />
                  <span className="line-clamp-1">
                    {chatMessages[chatMessages.length - 2].content.length > 30 
                      ? chatMessages[chatMessages.length - 2].content.substring(0, 27) + '...' 
                      : chatMessages[chatMessages.length - 2].content}
                  </span>
                </button>
              )}
            </div>
          </div>
          
          {/* 챗 영역 */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <div className="flex-1 overflow-y-auto p-4">
              {/* 채팅 메시지 */}
              <div className="max-w-3xl mx-auto">
                {/* 메시지가 없을 때 워터마크 표시 */}
                {chatMessages.length === 0 ? <EmptySQLQueryWatermark /> : (
                  <>
                    {chatMessages.map((msg, index) => (
                      <MessageBubble 
                        key={index}
                        type={msg.type}
                        content={msg.content}
                        timestamp={msg.timestamp}
                        sql={msg.sql}
                        result={msg.result}
                        onViewChart={handleViewChart}
                      />
                    ))}
                  </>
                )}
                
                {/* 로딩 인디케이터 */}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="flex items-end gap-2">
                      <div className="rounded-full w-8 h-8 bg-gray-800 flex items-center justify-center">
                        <FiLoader size={14} className="text-indigo-400 animate-spin" />
                      </div>
                      <div>
                        <div className="rounded-2xl px-4 py-2.5 bg-gray-800/80 border border-gray-700/50">
                          <div className="flex space-x-1.5">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* 오류 메시지 */}
            {errorMessage && (
              <div className="px-4 py-2 bg-red-900/20 border-t border-red-900/30 text-red-300 flex items-start gap-2 text-sm">
                <FiAlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                <p>{errorMessage}</p>
              </div>
            )}
            
            {/* 차트 영역 */}
            {showChart && tableData && tableData.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white flex items-center gap-1.5">
                    <FiBarChart2 size={14} className="text-indigo-400" />
                    <span>데이터 시각화</span>
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-md overflow-hidden border border-gray-700/50">
                      <button 
                        className={`px-2 py-1 text-xs ${chartType === 'bar' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
                        onClick={() => setChartType('bar')}
                      >
                        <FiBarChart2 size={12} />
                      </button>
                      <button 
                        className={`px-2 py-1 text-xs ${chartType === 'line' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
                        onClick={() => setChartType('line')}
                      >
                        <FiActivity size={12} />
                      </button>
                      <button 
                        className={`px-2 py-1 text-xs ${chartType === 'pie' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
                        onClick={() => setChartType('pie')}
                      >
                        <FiPieChart size={12} />
                      </button>
                      <button 
                        className={`px-2 py-1 text-xs ${chartType === 'area' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
                        onClick={() => setChartType('area')}
                      >
                        <FiTrendingUp size={12} />
                      </button>
                    </div>
                    
                    <button 
                      className="p-1 text-gray-400 hover:text-gray-300 rounded"
                      onClick={() => setShowChart(false)}
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                </div>
                
                <DataChart data={tableData} type={chartType} />
              </div>
            )}
            
            {/* 입력창 - ChatContainer와 디자인 통일 */}
            <div className="px-4 py-3 border-t border-gray-800/50 bg-gray-900/70 backdrop-blur-sm">
              <form onSubmit={(e) => {
                e.preventDefault();
                activeTab === 'sql' ? handleSubmit(e) : handleSqlLlmQuery(e);
              }} className="max-w-3xl mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={placeholderText}
                    className="w-full bg-gray-800/30 border border-gray-700/50 focus:border-indigo-500/60 rounded-full pl-4 pr-36 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  />
                  
                  <div className="absolute right-2 top-2 flex items-center gap-1.5">
                    {/* 모드 전환 버튼 */}
                    <button
                      type="button"
                      onClick={() => {
                        // 현재 탭 토글
                        if (activeTab === 'sql') {
                          handleTabChange('ai');
                        } else {
                          handleTabChange('sql');
                        }
                      }}
                      className="px-2 py-1.5 bg-gray-700/50 hover:bg-indigo-600/20 rounded-md text-gray-400 hover:text-indigo-300 transition-colors"
                      title={activeTab === 'sql' ? "AI 응답 생성으로 전환" : "SQL 생성으로 전환"}
                    >
                      {activeTab === 'sql' ? <FiZap size={16} /> : <FiCode size={16} />}
                    </button>
                    
                    {/* 전송 버튼 */}
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-medium transition-colors flex items-center gap-1.5"
                      disabled={isLoading}
                    >
                      <span className="mr-1">{activeTab === 'sql' ? "SQL 생성 모드" : "AI 응답 모드"}</span>
                      {isLoading ? (
                        <FiLoader size={14} className="animate-spin" />
                      ) : (
                        <FiSend size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* 사이드바 - DB 스키마 UI 개선 */}
        {showSchema && (
          <div className="w-full md:w-72 h-64 md:h-auto overflow-y-auto bg-gray-900/30 border-t md:border-t-0 md:border-l border-gray-800/70 md:flex-shrink-0">
            <div className="sticky top-0 bg-gray-900/40 backdrop-blur-sm z-10 py-3 px-4 border-b border-gray-800/50">
              <h3 className="text-sm font-medium text-white flex items-center gap-1.5">
                <FiDatabase size={14} className="text-indigo-400" />
                <span>데이터베이스 스키마</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                테이블 및 컬럼을 클릭하면 이름이 복사됩니다.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {dbSchema ? (
                parseDBSchema(dbSchema)
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  <FiLoader size={16} className="animate-spin mr-2" />
                  스키마 정보를 불러오는 중...
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 border-t border-gray-800/50">
              <h4 className="text-sm font-medium text-white mb-2.5 flex items-center gap-1.5">
                <FiTrendingUp size={14} className="text-indigo-400" />
                <span>활용 가이드</span>
              </h4>
              <ul className="text-xs text-gray-400 space-y-3">
                <li className="bg-gray-800/30 rounded-md p-3 border border-gray-700/50">
                  <div className="flex gap-2">
                    <FiExternalLink size={14} className="mt-0.5 text-indigo-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-300 mb-1">구체적인 질문하기</p>
                      <p className="text-gray-400">테이블 이름과 필드명을 명확하게 언급하면 더 정확한 결과를 얻을 수 있습니다.</p>
                    </div>
                  </div>
                </li>
                <li className="bg-gray-800/30 rounded-md p-3 border border-gray-700/50">
                  <div className="flex gap-2">
                    <FiPlay size={14} className="mt-0.5 text-indigo-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-300 mb-1">예시 쿼리 패턴</p>
                      <p className="text-gray-400 mb-1">효과적인 질문 패턴:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>"{`<테이블>`}에서 {`<조건>`}인 {`<항목>`} 보여줘"</li>
                        <li>"{`<기준>`}별 {`<집계함수>`} 계산해줘"</li>
                        <li>"{`<항목>`}이 가장 많은/적은 {`<대상>`} 찾아줘"</li>
                      </ul>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
      
      {/* 모드 전환 스위치 추가 */}
      <ModeToggleSwitch />
      
      {/* 확인 모달 */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={() => {
          setQueryHistory([]);
          localStorage.removeItem('sql_query_history');
          setIsConfirmModalOpen(false);
        }}
        title="히스토리 비우기"
        message="모든 쿼리 히스토리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      />
    </div>
  );
};

export default SQLQueryPage; 