import React, { useRef, useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ChatContainer from "./components/ChatContainer";
import SQLQueryPage from "./components/SQLQueryPage";
import Dashboard from "./components/dashboard/Dashboard";
import {
  FiChevronLeft,
  FiChevronRight,
  FiMessageSquare,
  FiPlus,
  FiX,
  FiLoader,
  FiCheckCircle,
  FiFile,
  FiMenu,
  FiAlignLeft,
  FiDatabase,
  FiAlertCircle,
  FiBarChart2
} from "react-icons/fi";

// API 기본 URL 상수 정의
const API_BASE_URL = 'http://172.10.2.70:8000';

// 백엔드 연결 상태를 관리하는 상수 추가
const BACKEND_STATUS = {
  UNKNOWN: 'unknown',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  ERROR: 'error'
};

const SIDEBAR_WIDTH = 320;
const SIDEBAR_MIN = 280;
const SIDEBAR_MAX = 450;

// 임베딩 알림 오버레이 컴포넌트 추가
const EmbeddingOverlay = ({ isActive, status, files }) => {
  if (!isActive && !status) return null;
  
  const isCompleted = status === '완료';
  
  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-[100] animate-fade-in">
      <div className="max-w-lg w-full px-6 py-8 rounded-2xl bg-gray-800/70 backdrop-blur-md text-center space-y-6">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          
          {!isCompleted ? (
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
          ) : (
            <div className="absolute inset-0 rounded-full border-4 border-green-500 flex items-center justify-center animate-pulse">
              <FiCheckCircle className="text-green-400" size={36} />
            </div>
          )}
          
          <div className="absolute inset-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <FiFile className={isCompleted ? "text-green-200" : "text-indigo-200"} size={24} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">
            {isCompleted ? "파일 임베딩 완료!" : (status || "파일 임베딩 처리 중...")}
          </h3>
          <p className="text-gray-300 text-sm">
            {isCompleted ? (
              <>파일이 성공적으로 임베딩되었습니다.<br/>이제 챗봇과의 대화에 활용할 수 있습니다.</>
            ) : (
              <>이 과정은 파일 크기와 내용에 따라 몇 분 정도 소요될 수 있습니다.<br/>
              임베딩이 완료될 때까지 기다려주세요.</>
            )}
          </p>
        </div>
        
        {files && files.length > 0 && !isCompleted && (
          <div className="bg-gray-900/50 rounded-xl p-4 max-h-40 overflow-y-auto">
            <p className="text-gray-400 text-xs mb-2">{files.length}개 파일 처리 중:</p>
            <div className="space-y-1.5">
              {files.map((file, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                  <span className="text-gray-200 text-sm truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {isCompleted && (
          <button 
            className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            onClick={() => { window.dispatchEvent(new CustomEvent('refreshIndexedFiles')); }}
          >
            파일 목록 보기
          </button>
        )}
      </div>
    </div>
  );
};

function App() {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); // md: 이상에서 기본적으로 열림
  const [userName, setUserName] = useState("사용자");
  const [scrollLocked, setScrollLocked] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const isResizing = useRef(false);
  const [userId, setUserId] = useState("user1"); // 임시 사용자 ID, 실제로는 인증 기반 ID 사용
  const [theme, setTheme] = useState(() => {
    // 항상 다크모드를 기본값으로 설정
    localStorage.setItem("theme", "dark");
    return "dark";
  });
  const [defaultCategory, setDefaultCategory] = useState("메뉴얼"); // 기본 카테고리 상태
  const [saveError, setSaveError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMessages, setCurrentMessages] = useState([
    {
      role: "assistant",
      content: "안녕하세요! 무엇을 도와드릴까요?",
      sources: [],
      timestamp: new Date().getTime(),
    },
  ]);
  const [filteredMessages, setFilteredMessages] = useState(currentMessages);
  // 임베딩 상태 관련 변수 추가
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState(null);
  const [embeddedFiles, setEmbeddedFiles] = useState([]);
  
  // SQL 쿼리 페이지 표시 여부 상태 추가
  const [showSQLPage, setShowSQLPage] = useState(false);
  // 모드 상태 추가 (chat, sql 또는 dashboard)
  const [mode, setMode] = useState('chat');
  // 파일 매니저 상태 추가
  const [fileManagerOpen, setFileManagerOpen] = useState(false);

  // 대시보드 관련 상태
  const [dashboardStats, setDashboardStats] = useState({
    totalQueries: 0,
    totalChats: 0,
    activeUsers: 0,
    averageQueriesPerDay: 0,
    queryCountByDate: []
  });
  
  // SQL 모드 관련 상태
  const [recentQueries, setRecentQueries] = useState([]);
  const [dbSchema, setDbSchema] = useState({});

  // 응답 스트리밍 상태 추가
  const [isStreaming, setIsStreaming] = useState(false);
  // 응답 중단을 위한 AbortController 레퍼런스 추가
  const abortControllerRef = useRef(null);

  // 백엔드 연결 상태를 관리하는 상수 추가
  const [backendStatus, setBackendStatus] = useState(BACKEND_STATUS.UNKNOWN);
  const [backendServices, setBackendServices] = useState({});
  const [pendingSync, setPendingSync] = useState([]);
  const backendCheckInterval = useRef(null);

  // 대화 응답 중 상태 추가 (App 함수 상단 useState 부분에)
  const [isResponding, setIsResponding] = useState(false);
  const [responseBlockedMessage, setResponseBlockedMessage] = useState(null);

  // 대화 중 잠금 설명 메시지 (다국어 지원 가능)
  const lockMessages = {
    conversationSwitch: "현재 대화 응답이 진행 중입니다. 완료 또는 중지 후 다른 대화로 이동할 수 있습니다.",
    newConversation: "현재 대화 응답이 진행 중입니다. 완료 또는 중지 후 새 대화를 시작할 수 있습니다."
  };

  // 대화 저장 함수 개선 - 백엔드 상태에 따라 다른 전략 사용
  const saveConversationToBackend = async (
    userId,
    conversationId,
    messages
  ) => {
    try {
      // 로컬 스토리지에 항상 저장
      const localSaveKey = `conversation_${conversationId}`;
      const conversationData = {
        id: conversationId,
        messages,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(localSaveKey, JSON.stringify(conversationData));
      
      // 백엔드 연결 상태 확인
      if (backendStatus !== BACKEND_STATUS.CONNECTED) {
        console.log("백엔드 연결 없음: 로컬에만 저장하고 동기화 예약");
        addToPendingSync(conversationId);
        return false;
      }
      
      // 백엔드 요청 시도 (타임아웃 설정)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      
      const response = await fetch(
        `${API_BASE_URL}/api/conversations/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
            conversationId: conversationId,
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              sources: msg.sources || [],
            })),
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`대화 저장 실패: ${response.status} ${response.statusText}`);
        setSaveError("대화 저장에 실패했습니다. 로컬에만 저장됩니다.");
        setTimeout(() => setSaveError(null), 5000);
        addToPendingSync(conversationId);
        return false;
      }
      
      console.log("대화가 백엔드에 저장되었습니다.");
      setSaveError(null); // 성공 시 오류 메시지 초기화
      removeFromPendingSync(conversationId); // 동기화 목록에서 제거
      return true;
    } catch (err) {
      console.warn("대화 저장 중 오류 발생:", err.message);
      setSaveError("대화 저장에 실패했습니다. 로컬에만 저장됩니다."); // 오류 메시지 설정
      setTimeout(() => setSaveError(null), 5000); // 5초 후 알림 사라짐
      addToPendingSync(conversationId); // 동기화 목록에 추가
      return false;
    }
  };

  // 대화 불러오기 함수 개선 - 백엔드 상태에 따라 다른 전략 사용
  const loadConversationFromBackend = async (userId, conversationId) => {
    // 먼저 로컬 데이터 확인
    const localSaveKey = `conversation_${conversationId}`;
    let localData = null;
    
    try {
      const storedData = localStorage.getItem(localSaveKey);
      if (storedData) {
        localData = JSON.parse(storedData);
      }
    } catch (err) {
      console.warn("로컬 대화 데이터 파싱 오류:", err);
    }
    
    // 백엔드 연결 상태 확인
    if (backendStatus !== BACKEND_STATUS.CONNECTED) {
      console.log("백엔드 연결 없음: 로컬 데이터 사용");
      
      if (localData) {
        // 로컬 데이터로 대화 업데이트
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: localData.messages }
              : conv
          )
        );
        return localData;
      }
      
      return null;
    }
    
    try {
      // 백엔드 요청 시도 (타임아웃 설정)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      
      const response = await fetch(
        `${API_BASE_URL}/api/conversations/load`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
            conversationId: conversationId,
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`대화 불러오기 실패: ${response.status} ${response.statusText}`);
        
        // 백엔드 실패 시 로컬 데이터 사용
        if (localData) {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId
                ? { ...conv, messages: localData.messages }
                : conv
            )
          );
          return localData;
        }
        
        return null;
      }
      
      const data = await response.json();
      if (data.status === "success" && data.conversation) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: data.conversation.messages }
              : conv
          )
        );
        console.log("대화가 백엔드에서 불러와졌습니다.");
        
        // 백엔드 데이터를 로컬에도 저장 (동기화)
        localStorage.setItem(
          localSaveKey, 
          JSON.stringify({
            id: conversationId,
            messages: data.conversation.messages,
            timestamp: new Date().toISOString()
          })
        );
        
        return data.conversation;
      }
    } catch (err) {
      console.warn("대화 불러오기 중 오류 발생:", err.message);
      
      // 오류 발생 시 로컬 데이터 사용
      if (localData) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: localData.messages }
              : conv
          )
        );
        return localData;
      }
    }
    
    return null;
  };

  // 백엔드 상태 확인 함수 추가
  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health-check`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3초 타임아웃
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          status: BACKEND_STATUS.CONNECTED,
          services: data.services,
          timestamp: data.timestamp
        };
      } else {
        return { 
          status: BACKEND_STATUS.ERROR,
          error: `HTTP 오류: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return { 
        status: BACKEND_STATUS.DISCONNECTED,
        error: error.message
      };
    }
  };

  // 백엔드 상태 확인 및 재연결 시도
  const checkAndUpdateBackendStatus = useCallback(async () => {
    const status = await checkBackendStatus();
    setBackendStatus(status.status);
    
    if (status.status === BACKEND_STATUS.CONNECTED) {
      setBackendServices(status.services || {});
      // 백엔드가 연결되면 미동기화 대화 동기화 시도
      syncPendingConversations();
    } else {
      setBackendServices({});
    }
    
    return status.status === BACKEND_STATUS.CONNECTED;
  }, []);

  // 백엔드 연결 상태를 주기적으로 확인
  useEffect(() => {
    // 첫 로드 시 상태 확인
    checkAndUpdateBackendStatus();
    
    // 30초마다 백엔드 상태 확인
    backendCheckInterval.current = setInterval(() => {
      checkAndUpdateBackendStatus();
    }, 30000);
    
    return () => {
      if (backendCheckInterval.current) {
        clearInterval(backendCheckInterval.current);
      }
    };
  }, [checkAndUpdateBackendStatus]);

  // 미동기화 대화 목록을 로컬 스토리지에서 관리
  const addToPendingSync = (conversationId) => {
    setPendingSync(prev => {
      if (!prev.includes(conversationId)) {
        const updated = [...prev, conversationId];
        localStorage.setItem('pendingConversationSyncs', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  };
  
  const removeFromPendingSync = (conversationId) => {
    setPendingSync(prev => {
      const updated = prev.filter(id => id !== conversationId);
      localStorage.setItem('pendingConversationSyncs', JSON.stringify(updated));
      return updated;
    });
  };
  
  // 로컬 스토리지에서 미동기화 목록 불러오기
  useEffect(() => {
    try {
      const pendingSyncs = JSON.parse(localStorage.getItem('pendingConversationSyncs') || '[]');
      setPendingSync(pendingSyncs);
    } catch (e) {
      console.warn("미동기화 목록 불러오기 실패", e);
      localStorage.setItem('pendingConversationSyncs', '[]');
    }
  }, []);

  // 백엔드 연결 시 미동기화 대화 동기화
  const syncPendingConversations = async () => {
    if (backendStatus !== BACKEND_STATUS.CONNECTED || pendingSync.length === 0) {
      return;
    }
    
    console.log(`미동기화 대화 ${pendingSync.length}개 동기화 시작`);
    
    for (const convId of pendingSync) {
      const localData = localStorage.getItem(`conversation_${convId}`);
      if (localData) {
        try {
          const { messages } = JSON.parse(localData);
          const success = await saveConversationToBackend(userId, convId, messages);
          if (success) {
            console.log(`대화 ${convId} 동기화 완료`);
            removeFromPendingSync(convId);
          }
        } catch (error) {
          console.warn(`대화 ${convId} 동기화 실패: ${error.message}`);
          // 동기화 실패 시 계속 재시도 목록에 유지
        }
      } else {
        // 로컬 데이터가 없는 경우 목록에서 제거
        removeFromPendingSync(convId);
      }
    }
  };
  
  // 브라우저 콘솔에서 직접 상태를 변경할 수 있는 디버깅 함수 추가
  useEffect(() => {
    // 전역 함수로 등록
    window.setAppMode = (newMode) => {
      if (newMode === 'sql' || newMode === 'chat' || newMode === 'dashboard') {
        setMode(newMode);
        return true;
      }
      return false;
    };

    window.toggleAppMode = () => {
      const modes = ['chat', 'sql', 'dashboard'];
      const currentIndex = modes.indexOf(mode);
      const nextIndex = (currentIndex + 1) % modes.length;
      const newMode = modes[nextIndex];
      
      setMode(newMode);
      return newMode;
    };
    
    window.debugAppState = () => {
      // 디버깅 함수는 유지
    };
    
    return () => {
      // 정리 함수
      delete window.setAppMode;
      delete window.toggleAppMode;
      delete window.debugAppState;
    };
  }, [mode]);
  
  // mode 상태가 변경될 때 toast 메시지 표시
  useEffect(() => {

    // 전역 변수에 현재 모드 저장 (ModeToggleSwitch 컴포넌트에서 참조)
    if (typeof window !== 'undefined') {
      window.currentAppMode = mode;
    }
    
    // 모드 변경 시 토스트 메시지 표시
    if (mode === 'sql') {
      showModeChangeToast('SQL 질의 모드로 전환했습니다');
    } else if (mode === 'chat') {
      showModeChangeToast('챗봇 모드로 전환했습니다');
    } else if (mode === 'dashboard') {
      showModeChangeToast('대시보드 모드로 전환했습니다');
    }
  }, [mode]);

  // showSQLPage 상태 변경 감지 useEffect 추가
  useEffect(() => {
  }, [showSQLPage]);

  // 테마 변경 함수
  const toggleTheme = useCallback(() => {
    // 다크모드만 유지하도록 수정
    setTheme("dark");
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark");
  }, []);
  
  // 테마 적용
  useEffect(() => {
    // 항상 다크모드 적용
    document.documentElement.classList.add("dark");
  }, [theme]);

  // 초기 대화 목록 로드 (로컬 스토리지 또는 백엔드)
  useEffect(() => {
    const savedConversations = localStorage.getItem("conversations");
    const savedActiveId = localStorage.getItem("activeConversationId");
    let initialConvs = [];
    if (savedConversations) {
      try {
        initialConvs = JSON.parse(savedConversations);
        initialConvs = initialConvs.map((conv) => ({
          ...conv,
          messages: conv.messages.map((msg) => ({
            ...msg,
            sources: msg.sources || [],
          })),
        }));
      } catch (e) {
        console.error("Error parsing conversations from localStorage:", e);
        localStorage.removeItem("conversations");
      }
    }
    // conversations가 0개면 새 대화 생성
    if (initialConvs.length === 0) {
      const now = new Date();
      const newConv = {
        id: Date.now().toString(),
        title: `대화 1`,
        timestamp: now.toLocaleString(),
        messages: [
          {
            role: "assistant",
            content: "안녕하세요! 무엇을 도와드릴까요?",
            sources: [],
          },
        ],
        pinned: false,
      };
      initialConvs = [newConv];
      setConversations(initialConvs);
      setActiveConversationId(newConv.id);
      localStorage.setItem("conversations", JSON.stringify(initialConvs));
      localStorage.setItem("activeConversationId", JSON.stringify(newConv.id));
    } else {
      setConversations(initialConvs);
      let initialActiveId = null;
      if (savedActiveId) {
        try {
          initialActiveId = JSON.parse(savedActiveId);
          if (!initialConvs.some((conv) => conv.id === initialActiveId)) {
            initialActiveId = initialConvs[initialConvs.length - 1].id;
          }
        } catch (e) {
          initialActiveId = initialConvs[initialConvs.length - 1].id;
        }
      } else {
        initialActiveId = initialConvs[initialConvs.length - 1].id;
      }
      setActiveConversationId(initialActiveId);
    }
  }, []);

  // 초기 설정 로드 (로컬 스토리지 또는 백엔드) 수정
  useEffect(() => {
    // 다크모드로 항상 설정
    const savedTheme = "dark";
    const savedCategory = localStorage.getItem("defaultCategory");
    setTheme(savedTheme);
    document.documentElement.classList.add("dark");
    if (savedCategory) {
      setDefaultCategory(savedCategory);
    }
    // 백엔드에서 설정 불러오기
    loadUserSettingsFromBackend(userId);
  }, [userId]);

  // 검색어 변경 핸들러
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // searchTerm 또는 currentMessages가 변경될 때 필터링 로직 적용
  useEffect(() => {
    if (searchTerm && currentMessages.length > 0) {
      const filtered = currentMessages.filter(
        (msg) =>
          typeof msg.content === "string" &&
          msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(currentMessages);
    }
  }, [searchTerm, currentMessages]);

  const isDark = theme === "dark";

  // 인덱싱된 파일 목록 새로고침을 위한 이벤트 리스너 추가
  useEffect(() => {
    const handleRefreshFilesEvent = () => {
      setFileManagerOpen(true);
    };
    
    window.addEventListener('refreshIndexedFiles', handleRefreshFilesEvent);
    
    return () => {
      window.removeEventListener('refreshIndexedFiles', handleRefreshFilesEvent);
    };
  }, []);

  // 파일 목록 새로고침 함수 추가
  const handleRefreshFiles = () => {
    setFileManagerOpen(true);
   
  };

  // 파일 업로드 완료 핸들러 추가
  const handleUploadSuccess = (files) => {
  
    setIsEmbedding(true);
    setEmbeddedFiles(files);

    // 5초 후 임베딩 완료 처리 (실제로는 서버에서 완료 신호를 받아야 함)
    setTimeout(() => {
      setIsEmbedding(false);
      // 임베딩 완료 상태를 설정하고 UI로 표시
      setEmbeddingStatus('완료');
      // 1초 후 임베딩 상태 초기화 (기존 5초에서 1초로 변경)
      setTimeout(() => {
        setEmbeddingStatus(null);
        setEmbeddedFiles([]);
      }, 1000); // 5000에서 1000으로 변경
    }, 5000);
  };

  // 백엔드에 사용자 설정 저장
  const saveUserSettingsToBackend = async (userId, settings) => {
    try {
      const response = await fetch(
        "/api/settings/save",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
            settings: settings,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          `사용자 설정 저장 실패: ${response.status} ${response.statusText}`
        );
      }
      console.log("사용자 설정이 백엔드에 저장되었습니다.");
    } catch (err) {
      console.error("사용자 설정 저장 중 오류 발생:", err);
    }
  };

  // 백엔드에서 사용자 설정 불러오기
  const loadUserSettingsFromBackend = async (userId) => {
    try {
      // 백엔드 연결 시도 전 로컬 기본값 설정
      const savedTheme = localStorage.getItem("theme") || "dark";
      const savedDefaultCategory = localStorage.getItem("defaultCategory") || "메뉴얼";
      
      // 로컬 저장소의 값 적용
      setTheme(savedTheme);
      setDefaultCategory(savedDefaultCategory);
      document.documentElement.classList.toggle("light", savedTheme === "light");
      
      console.log("로컬 설정 적용됨:", { theme: savedTheme, defaultCategory: savedDefaultCategory });
      
      // 백엔드 요청 시도 (타임아웃 설정)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃
      
      const response = await fetch(
        "/api/settings/load",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`사용자 설정 불러오기 실패: ${response.status} ${response.statusText}`);
        return; // 이미 로컬 설정이 적용되었으므로 종료
      }
      
      const data = await response.json();
      if (data.status === "success" && data.settings) {
        if (data.settings.theme) {
          setTheme(data.settings.theme);
          localStorage.setItem("theme", data.settings.theme);
          document.documentElement.classList.toggle(
            "light",
            data.settings.theme === "light"
          );
        }
        if (data.settings.defaultCategory) {
          setDefaultCategory(data.settings.defaultCategory);
          localStorage.setItem(
            "defaultCategory",
            data.settings.defaultCategory
          );
        }
        console.log("사용자 설정이 백엔드에서 불러와졌습니다.");
      } else if (data.status === "not_found") {
        console.log("사용자 설정이 없습니다. 로컬 설정을 유지합니다.");
      }
    } catch (err) {
      // 오류 발생 시 콘솔에 경고만 표시하고 앱은 계속 실행
      console.warn("사용자 설정 불러오기 중 오류 발생:", err.message);
      console.log("로컬 설정을 사용합니다.");
    }
  };

  // activeConversationId 변경 시 localStorage에 저장
  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem(
        "activeConversationId",
        JSON.stringify(activeConversationId)
      );
    }
  }, [activeConversationId]);

  // 대화 메시지 변경 시 자동 저장
  useEffect(() => {
    // 대화가 변경되면 로컬 스토리지에 자동 저장
    if (conversations.length > 0) {
      try {
        // 직렬화 전에 DOM 요소 참조를 제거하기 위해 순수 객체만 추출
        // 순환 참조 문제 해결: content가 문자열이 아닌 경우 안전하게 변환
        const cleanConversations = conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          timestamp: conv.timestamp,
          pinned: !!conv.pinned,
          messages: conv.messages.map(msg => {
            // content가 문자열이 아닌 경우(React 요소 등) 안전하게 처리
            let safeContent = msg.content;
            if (typeof msg.content !== 'string') {
              try {
                // React 요소나 DOM 노드인 경우 텍스트 내용만 추출 시도
                safeContent = msg.content?.textContent || 
                             msg.content?.toString() || 
                             '[표시할 수 없는 콘텐츠]';
              } catch (e) {
                safeContent = '[표시할 수 없는 콘텐츠]';
              }
            }
            
            // sources 배열 안전 처리
            let safeSources = [];
            if (Array.isArray(msg.sources)) {
              safeSources = msg.sources.map(source => {
                // 각 소스 객체에 대해 안전하게 처리
                if (typeof source === 'object' && source !== null) {
                  // 객체인 경우 안전한 속성만 추출
                  const safeSource = {};
                  // 일반적인 소스 속성들만 복사
                  if (source.title) safeSource.title = String(source.title);
                  if (source.url) safeSource.url = String(source.url);
                  if (source.text) safeSource.text = String(source.text);
                  if (source.file) safeSource.file = String(source.file);
                  if (source.page) safeSource.page = Number(source.page);
                  if (source.score) safeSource.score = Number(source.score);
                  return safeSource;
                }
                return source; // 원시 타입이면 그대로 반환
              }).filter(Boolean); // null/undefined 제거
            }
            
            return {
              role: msg.role,
              content: safeContent,
              timestamp: msg.timestamp || Date.now(),
              sources: safeSources
            };
          })
        }));
        
        localStorage.setItem("conversations", JSON.stringify(cleanConversations));
        console.log("로컬 스토리지에 대화 저장 완료");
      } catch (error) {
        console.error("대화 저장 중 오류 발생:", error);
      }
      
      // 활성화된 대화에 대해서만 백엔드에 저장
      if (activeConversationId) {
        const activeConv = conversations.find(
          (c) => c.id === activeConversationId
        );
        if (activeConv && activeConv.messages.length > 0) {
          // 백엔드 저장 비활성화 (422 오류 문제 해결을 위함)
          // saveConversationToBackend(userId, activeConversationId, activeConv.messages);
        }
      }
    }
  }, [conversations, activeConversationId, userId]);

  // 전체 대화 삭제 기능 추가
  const deleteAllConversations = () => {
    try {
      // 로컬 상태 초기화
      setConversations([]);
      setActiveConversationId(null);
      setCurrentMessages([]);
      
      // 로컬 스토리지 데이터 삭제
      localStorage.removeItem('conversations');
      localStorage.removeItem('activeConversationId');
      
      // 백엔드에 요청 (옵션)
      fetch("/api/conversations/delete-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: "user123" }),
      }).catch(err => {
        console.warn("백엔드에 전체 삭제 요청 실패:", err);
        // 백엔드 실패해도 로컬에서는 삭제된 상태로 유지
      });
      
      // 성공 메시지 표시
      showModeChangeToast("모든 대화가 삭제되었습니다");
      
      // 새 대화 시작 - 항상 '대화 1'로 시작
      handleNewConversation(null, defaultCategory, true);
    } catch (err) {
      console.error("대화 전체 삭제 중 오류 발생:", err);
    }
  };

  // 새 대화 생성
  const handleNewConversation = (topic, category, forceFirst = false, skipResponseCheck = false) => {
    // 응답 중이면 새 대화 생성 차단 (skipResponseCheck가 true인 경우 검사 건너뛰기)
    if (isResponding && !skipResponseCheck) {
      console.log("대화 응답 중에는 새 대화를 생성할 수 없습니다.");
      setResponseBlockedMessage(lockMessages.newConversation);
      setTimeout(() => setResponseBlockedMessage(null), 3000); // 3초 후 메시지 제거
      return null;
    }
    
    // 이미 응답 중이면서 skipResponseCheck가 true인 경우, 현재 대화 ID 반환
    if (isResponding && skipResponseCheck && activeConversationId) {
      return activeConversationId;
    }
    
    try {
      console.log('새 대화 시작...', topic, category);
    
      // 초기 제목 설정 (forceFirst가 true이면 항상 "대화 1"로 설정)
      const initialTitle = topic || (forceFirst ? "제목 없음" : `대화 ${conversations.length + 1}`);
      
      // 고유 ID 생성
      const newId = `conv_${Date.now()}`;
      
      // 새 대화 객체 생성 (구조 개선 - 메타데이터 추가)
    const newConversation = {
        id: newId,
        title: initialTitle,
      messages: [
          // 시스템 시작 메시지 추가하여 챗봇이 먼저 인사하도록 함
        {
          role: "assistant",
            content: "안녕하세요! 무엇을 도와드릴까요?",
            sources: [],
            timestamp: Date.now(),
          }
        ],
        timestamp: Date.now(),
        category: category || defaultCategory,
      pinned: false,
        metadata: {
          messageCount: 1,
          firstMessageTimestamp: Date.now(),
          lastActivity: Date.now()
        }
      };
    
      // 새 대화 추가 (맨 앞 또는 맨 뒤)
      if (forceFirst) {
        // 가장 최근 대화로 추가 (맨 앞)
        setConversations(prevConversations => [
          newConversation,
          ...prevConversations
        ]);
      } else {
        // 새 대화 추가 (맨 뒤)
        setConversations(prevConversations => [
          ...prevConversations,
          newConversation
        ]);
      }
      
      // 새 대화를 현재 활성 대화로 설정
      setActiveConversationId(newId);
      
      // 메시지 초기화
      setCurrentMessages([
        // 시스템 시작 메시지 추가하여 챗봇이 먼저 인사하도록 함
        {
          role: "assistant",
          content: "안녕하세요! 무엇을 도와드릴까요?",
          sources: [],
          timestamp: Date.now(),
        }
      ]);
      
      // 검색어 초기화
      setSearchTerm("");
      
      // 사이드바 모바일에서 자동으로 닫기
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
      
      // URL 파라미터 업데이트
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("convId", newId);
      window.history.pushState({}, "", currentUrl.toString());

      // localStorage에 활성 대화 ID 저장
      localStorage.setItem("activeConversationId", newId);
      
      return newId;
    } catch (error) {
      console.error('새 대화 생성 중 오류 발생:', error);
      return null;
    }
  };

  // 대화 선택
  const handleSelectConversation = (id) => {
    // 이미 선택된 대화면 아무것도 하지 않음
    if (id === activeConversationId) return;
    
    // 응답 중이면 대화 전환 차단 (더 강력하게 차단)
    if (isResponding) {
      console.log("대화 응답 중에는 대화를 전환할 수 없습니다.");
      setResponseBlockedMessage(lockMessages.conversationSwitch);
      setTimeout(() => setResponseBlockedMessage(null), 3000); // 3초 후 메시지 제거
      
      // 이벤트 전파 중지 및 기본 동작 방지
      return false;
    }

    // 대화 전환 처리
    setActiveConversationId(id);

    // URL 파라미터 업데이트
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("convId", id);
    window.history.pushState({}, "", currentUrl.toString());

    // localStorage에 활성 대화 ID 저장
    localStorage.setItem("activeConversationId", id);

    // 모바일에서 사이드바 닫기
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    
    // 대화를 먼저 불러오고 활성 대화 ID 설정
    const activeConv = conversations.find((conv) => conv.id === id);
    if (activeConv) {
      setCurrentMessages(activeConv.messages);
    } else {
      loadConversationFromBackend(userId, id).then(() => {
        const loadedConv = conversations.find((conv) => conv.id === id);
        if (loadedConv) {
          setCurrentMessages(loadedConv.messages);
        }
      });
    }
  };

  // 대화 삭제
  const handleDeleteConversation = (id) => {
    // 응답 중이면 대화 삭제 차단
    if (isResponding) {
      console.log("대화 응답 중에는 대화를 삭제할 수 없습니다.");
      setResponseBlockedMessage("현재 대화 응답이 진행 중입니다. 완료 또는 중지 후 대화를 삭제할 수 있습니다.");
      setTimeout(() => setResponseBlockedMessage(null), 3000); // 3초 후 메시지 제거
      return;
    }
    
    // 확인 창 없이 바로 삭제 처리
    setConversations((prev) => {
      const updated = prev.filter((conv) => conv.id !== id);
      let newActive = activeConversationId;
      if (id === activeConversationId) {
        newActive = updated.length > 0 ? updated[updated.length - 1].id : null;
        setActiveConversationId(newActive);
      }
      // conversations가 0개가 되면 새 대화 자동 생성
      if (updated.length === 0) {
        const now = new Date();
        const newConv = {
          id: Date.now().toString(),
          title: "대화 1",
          timestamp: now.toLocaleString(),
          messages: [
            {
              role: "assistant",
              content: "안녕하세요! 무엇을 도와드릴까요?",
              sources: [],
            },
          ],
          pinned: false,
        };
        setActiveConversationId(newConv.id);
        return [newConv];
      }
      return updated;
    });
  };

  // 대화 제목 변경
  const handleRenameConversation = (id, newTitle) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, title: newTitle } : conv))
    );
  };

  // 대화 즐겨찾기 토글
  const handleTogglePinConversation = (id) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, pinned: !conv.pinned } : conv
      )
    );
  };

  // 모드 전환 함수 - 챗봇 <-> SQL 질의 모드 전환
  const onToggleMode = (mode) => {
    console.log('onToggleMode 호출됨:', mode, '현재 상태:', showSQLPage);
    
    try {
      if (mode === 'sql') {
        console.log('SQL 모드로 전환 중...');
        if (!showSQLPage) {  // 현재 SQL 모드가 아닐 때만 전환
          setShowSQLPage(true);
          // 모드 전환 토스트 메시지 표시
          showModeChangeToast('SQL 질의 모드로 전환했습니다');
        }
      } else if (mode === 'chat') {
        console.log('챗봇 모드로 전환 중...');
        if (showSQLPage) {  // 현재 SQL 모드일 때만 전환
          setShowSQLPage(false);
          // 모드 전환 토스트 메시지 표시
          showModeChangeToast('챗봇 모드로 전환했습니다');
        }
      } else {
        // 모드가 지정되지 않은 경우 토글
        const newMode = !showSQLPage;
        console.log('모드 토글 중...', newMode ? 'SQL로' : '챗봇으로');
        setShowSQLPage(newMode);
        // 모드 전환 토스트 메시지 표시
        showModeChangeToast(newMode ? 'SQL 질의 모드로 전환했습니다' : '챗봇 모드로 전환했습니다');
      }
      console.log('모드 전환 요청 완료. 현재 showSQLPage 상태:', showSQLPage, '(실제 변경은 리렌더링 후 적용됨)');
    } catch (error) {
      console.error('모드 전환 중 오류 발생:', error);
    }
  };

  // 모드 전환 토스트 메시지 표시 함수
  const showModeChangeToast = (message) => {
    // 토스트 메시지 비활성화
    console.log('토스트 메시지 비활성화됨:', message);
    return; // 함수 실행 중단
  };

  // 대시보드 통계 데이터 가져오기
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/stats", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          timeRange: 'month'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.stats) {
          setDashboardStats(data.stats);
        }
      } else {
        console.error('대시보드 통계 데이터를 불러오는데 실패했습니다.');
        
        // 목데이터 설정 (API 응답 실패 시)
        setDashboardStats({
          totalQueries: 1284,
          totalChats: 3562,
          activeUsers: 215,
          averageQueriesPerDay: 42.8,
          queryCountByDate: [
            { date: '1월', value: 130 },
            { date: '2월', value: 245 },
            { date: '3월', value: 375 },
            { date: '4월', value: 480 },
            { date: '5월', value: 520 },
            { date: '6월', value: 620 }
          ]
        });
      }
    } catch (error) {
      console.error('대시보드 통계 데이터 가져오기 오류:', error);
      
      // 목데이터 설정 (오류 발생 시)
      setDashboardStats({
        totalQueries: 1284,
        totalChats: 3562,
        activeUsers: 215,
        averageQueriesPerDay: 42.8,
        queryCountByDate: [
          { date: '1월', value: 130 },
          { date: '2월', value: 245 },
          { date: '3월', value: 375 },
          { date: '4월', value: 480 },
          { date: '5월', value: 520 },
          { date: '6월', value: 620 }
        ]
      });
    }
  }, []);
  
  // 최근 SQL 쿼리 가져오기
  const fetchRecentQueries = useCallback(async () => {
    try {
      const response = await fetch("/api/sql/recent-queries");
      
      if (response.ok) {
        const data = await response.json();
        if (data.queries) {
          setRecentQueries(data.queries);
        }
      } else {
        console.error('최근 쿼리 데이터를 불러오는데 실패했습니다.');
        
        // 목데이터 설정
        setRecentQueries([
          {
            id: 1,
            question: "지난 달 매출이 가장 높은 상품은?",
            sql: "SELECT product_name, SUM(amount) as total FROM sales WHERE date >= '2023-05-01' GROUP BY product_name ORDER BY total DESC LIMIT 1",
            timestamp: Date.now() - 1000 * 60 * 30 // 30분 전
          },
          {
            id: 2,
            question: "현재 재고가 10개 미만인 상품 목록",
            sql: "SELECT product_name, stock FROM inventory WHERE stock < 10 ORDER BY stock ASC",
            timestamp: Date.now() - 1000 * 60 * 60 * 2 // 2시간 전
          },
          {
            id: 3,
            question: "각 지역별 고객 수 통계",
            sql: "SELECT region, COUNT(*) as customer_count FROM customers GROUP BY region ORDER BY customer_count DESC",
            timestamp: Date.now() - 1000 * 60 * 60 * 24 // 어제
          }
        ]);
      }
    } catch (error) {
      console.error('최근 쿼리 데이터 가져오기 오류:', error);
      
      // 목데이터 설정
      setRecentQueries([
        {
          id: 1,
          question: "지난 달 매출이 가장 높은 상품은?",
          sql: "SELECT product_name, SUM(amount) as total FROM sales WHERE date >= '2023-05-01' GROUP BY product_name ORDER BY total DESC LIMIT 1",
          timestamp: Date.now() - 1000 * 60 * 30 // 30분 전
        },
        {
          id: 2,
          question: "현재 재고가 10개 미만인 상품 목록",
          sql: "SELECT product_name, stock FROM inventory WHERE stock < 10 ORDER BY stock ASC",
          timestamp: Date.now() - 1000 * 60 * 60 * 2 // 2시간 전
        },
        {
          id: 3,
          question: "각 지역별 고객 수 통계",
          sql: "SELECT region, COUNT(*) as customer_count FROM customers GROUP BY region ORDER BY customer_count DESC",
          timestamp: Date.now() - 1000 * 60 * 60 * 24 // 어제
        }
      ]);
    }
  }, []);
  
  // DB 스키마 정보 가져오기
  const fetchDbSchema = useCallback(async () => {
    try {
      const response = await fetch("/api/sql/schema");
      
      if (response.ok) {
        const data = await response.json();
        if (data.schema) {
          setDbSchema(data.schema);
        }
      } else {
        console.error('DB 스키마 정보를 불러오는데 실패했습니다.');
        
        // 목데이터 설정
        setDbSchema({
          'customers': ['id', 'name', 'email', 'phone', 'region', 'created_at'],
          'products': ['id', 'product_name', 'category', 'price', 'description'],
          'sales': ['id', 'customer_id', 'product_id', 'date', 'amount', 'quantity'],
          'inventory': ['id', 'product_id', 'stock', 'updated_at']
        });
      }
    } catch (error) {
      console.error('DB 스키마 정보 가져오기 오류:', error);
      
      // 목데이터 설정
      setDbSchema({
        'customers': ['id', 'name', 'email', 'phone', 'region', 'created_at'],
        'products': ['id', 'product_name', 'category', 'price', 'description'],
        'sales': ['id', 'customer_id', 'product_id', 'date', 'amount', 'quantity'],
        'inventory': ['id', 'product_id', 'stock', 'updated_at']
      });
    }
  }, []);

  // 모드가 변경될 때 필요한 데이터 로딩
  useEffect(() => {
    if (mode === 'dashboard') {
      fetchDashboardStats();
    } else if (mode === 'sql') {
      fetchRecentQueries();
      fetchDbSchema();
    }
  }, [mode, fetchDashboardStats, fetchRecentQueries, fetchDbSchema]);

  // 제출 함수 수정 - 응답 상태 관리 추가
  const handleSubmit = async (input, selectedCategory) => {
    if (!input.trim()) return;
    
    // 이미 응답 중이면 중복 요청 방지
    if (isResponding) {
      console.log("이미 응답 중입니다. 중복 요청을 방지합니다.");
      return;
    }

    // 응답 시작 - 잠금 활성화 (상태 변수 먼저 업데이트)
    setIsResponding(true);
    
    // 채팅 모드가 아니면 새 대화 생성 (응답 검사 건너뛰기)
    let currentConversationId = activeConversationId;
    if (!activeConversationId) {
      currentConversationId = handleNewConversation("", selectedCategory, true, true);
    }
    
    // currentConversationId가 null이면 오류 발생
    if (!currentConversationId) {
      console.error("대화 ID를 생성할 수 없습니다.");
      setIsResponding(false); // 잠금 해제
      return;
    }

    // 사용자 메시지 추가
    const userMessage = {
      role: "user",
      content: input,
      sources: [],
    };

    setCurrentMessages((prev) => [...prev, userMessage]);

    // 대화 목록 업데이트
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? { ...conv, messages: [...conv.messages, userMessage] }
          : conv
      )
    );

    try {
      // 로딩 상태 설정
      setIsLoading(true);

      // 백엔드에 질문 전송
      const endpoint = useRagMode
        ? "/api/chat"
        : useSqlMode
          ? "/api/sql-and-llm"
          : "/api/chat";

      // 이전 대화 내역 구성
      const history = currentMessages
        .filter((m) => m.role !== "error") // 오류 메시지 제외
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // 응답 스트림 설정
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: input,
          category: selectedCategory || "메뉴얼",
          history: history,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `서버 오류: ${response.status} ${response.statusText}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      let content = "";
      let sources = [];
      let messageId = "";
      let fullMessageReceived = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        result += chunk;

        const lines = result.split("\n\n");
        result = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.event === "eos") {
                fullMessageReceived = true;
                if (sources.length > 0) {
                  // 메시지 ID도 같이 저장
                  messageId = data.messageId || "";
                }
                continue;
              }

              if (data.token) {
                content += data.token;
                // 스트리밍 중에도 메시지 업데이트
                setCurrentMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (
                    lastMessage &&
                    lastMessage.role === "assistant" &&
                    !fullMessageReceived
                  ) {
              return [
                      ...prev.slice(0, prev.length - 1),
                      {
                        ...lastMessage,
                        content,
                        sources: sources.length > 0 ? sources : [],
                      },
                    ];
                  } else if (!fullMessageReceived) {
                    return [
                      ...prev,
                      {
                        role: "assistant",
                        content,
                        sources: sources.length > 0 ? sources : [],
                      },
                    ];
                  }
                  return prev;
                });
              }

              if (data.sources) {
                sources = data.sources;
              }
            } catch (e) {
              console.error("JSON 파싱 오류:", e, line.substring(6));
            }
          }
        }
      }

      // 완료된 메시지를 최종 상태로 업데이트
      const finalMessage = {
        role: "assistant",
        content,
        sources,
        messageId,
      };

      // 메시지 목록 업데이트
      setCurrentMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            return [
            ...prev.slice(0, prev.length - 1),
            finalMessage,
          ];
        }
        return [...prev, finalMessage];
      });

      // 대화 목록 업데이트
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === currentConversationId) {
            const updatedMessages = [...conv.messages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              updatedMessages[updatedMessages.length - 1] = finalMessage;
            } else {
              updatedMessages.push(finalMessage);
            }
            return { ...conv, messages: updatedMessages };
          }
          return conv;
        })
      );

      // 첫 응답이면 대화 제목 생성
      if (currentMessages.length <= 2 && currentConversationId) {
        generateTitleForConversation(currentConversationId, [
          ...currentMessages,
          userMessage,
          finalMessage,
        ]);
      }

      // 대화 저장
      saveConversationToBackend(
        userId,
        currentConversationId,
        conversations.find(
          (conv) => conv.id === currentConversationId
        )?.messages.concat(finalMessage) || []
      );
    } catch (error) {
      console.error("오류 발생:", error);

      // 오류 메시지 추가
        const errorMessage = {
        role: "error",
        content: `오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`,
      };

      setCurrentMessages((prev) => [...prev, errorMessage]);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, errorMessage] }
            : conv
        )
      );
    } finally {
      // 로딩 상태 해제
      setIsLoading(false);
      
      // 응답 완료 - 잠금 해제
      setIsResponding(false);
    }
  };

  // 응답 중지 함수 수정 - 잠금 해제 추가
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      // 중지 시 잠금 해제
      setIsResponding(false);
    }
  };

  // 응답 차단 메시지 컴포넌트 추가 (return 부분의 적절한 위치에 삽입)
  const ResponseBlockedMessage = () => {
    if (!responseBlockedMessage) return null;
    
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                     bg-red-600 text-white px-4 py-2 rounded-md shadow-lg
                     animate-fade-in-down max-w-md text-center">
        <p>{responseBlockedMessage}</p>
      </div>
    );
  };

  // 반응형: 화면 크기 변경 시 사이드바 상태 업데이트
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && sidebarOpen) {
        setSidebarOpen(false);
      } else if (window.innerWidth >= 1200 && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarOpen]);

  // 드래그 핸들러
  const handleMouseDown = (e) => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = Math.max(
      SIDEBAR_MIN,
      Math.min(SIDEBAR_MAX, e.clientX)
    );
    setSidebarWidth(newWidth);
  };
  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // 토글(여닫이) 버튼
  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 메시지 업데이트
  const handleUpdateMessages = (updatedMessages) => {
    if (!activeConversationId) return;
    
    // 대화 업데이트
    setConversations((prev) => {
      const updated = prev.map((conv) => {
        if (conv.id === activeConversationId) {
          // 기존 대화 업데이트
          return { ...conv, messages: updatedMessages, timestamp: new Date().getTime() };
        }
        return conv;
      });
      return updated;
    });
    setCurrentMessages(updatedMessages);
    
    // 자동 제목 생성 로직: 사용자 메시지가 있을 때 모든 제목에 대해 동작
    const userMessages = updatedMessages.filter(msg => msg.role === "user");
    
    // 첫 번째 사용자 메시지가 추가됐을 때만 자동 제목 생성을 수행
    const activeConv = conversations.find(c => c.id === activeConversationId);
    const prevUserMessages = activeConv?.messages?.filter(msg => msg.role === "user") || [];
    
    if (userMessages.length > 0 && prevUserMessages.length === 0) {
      console.log("첫 질문 감지: 자동 제목 생성 시도");
      // 비동기로 제목 생성 API 호출
      generateTitleForConversation(activeConversationId, updatedMessages);
    }
  };

  // 대화 제목 자동 생성 함수
  const generateTitleForConversation = async (conversationId, messages) => {
    try {
      console.log("제목 생성 API 호출 - 메시지:", messages);
      
      // 백엔드 요청 시도 (타임아웃 설정)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      
      const response = await fetch(`${API_BASE_URL}/api/generate-title`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`제목 생성 실패: ${response.status} ${response.statusText}`);
        // 백엔드 API 호출 실패 시 대화 메시지 기반으로 제목 생성
        generateFallbackTitle(conversationId, messages);
        return;
      }
      
      const data = await response.json();
      console.log("제목 생성 응답:", data);
      
      if (data.title) {
        // 백엔드에서 제공한 제목으로 업데이트
        handleRenameConversation(conversationId, data.title);
      } else {
        // 실패하면 폴백 제목 생성
        generateFallbackTitle(conversationId, messages);
      }
    } catch (err) {
      console.warn("제목 생성 중 오류 발생:", err.message);
      // 오류 발생 시 폴백 제목 생성
      generateFallbackTitle(conversationId, messages);
    }
  };

  // 오류 시 폴백 제목 생성 함수
  const generateFallbackTitle = (conversationId, messages) => {
    try {
      // 첫 사용자 메시지를 기반으로 제목 생성
      const userMessage = messages.find(msg => msg.role === "user");
      
      if (userMessage) {
        // 첫 질문의 처음 15자를 추출하고 말줄임표 추가
        let title = userMessage.content.trim().substring(0, 15);
        if (userMessage.content.length > 15) {
          title += "...";
        }
        
        // 제목이 너무 짧으면 기본 제목 사용
        if (title.length < 5) {
          const defaultTitle = `대화 ${new Date().toLocaleDateString('ko-KR')}`;
          handleRenameConversation(conversationId, defaultTitle);
    } else {
          // 추출한 제목으로 업데이트
          handleRenameConversation(conversationId, title);
        }
      }
    } catch (error) {
      console.warn("폴백 제목 생성 실패:", error);
      // 최종 폴백: 현재 날짜/시간 기반 제목
      const timestamp = new Date().toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      handleRenameConversation(conversationId, `대화 ${timestamp}`);
    }
  };

  // 백엔드 상태 표시 컴포넌트
  const BackendStatusIndicator = () => {
    // 상태에 따른 스타일 정의
    const getStatusStyles = () => {
      switch (backendStatus) {
        case BACKEND_STATUS.CONNECTED:
          return {
            color: 'green',
            icon: '●',
            label: '연결됨'
          };
        case BACKEND_STATUS.DISCONNECTED:
          return {
            color: 'red',
            icon: '●',
            label: '연결 끊김'
          };
        case BACKEND_STATUS.CONNECTING:
          return {
            color: 'orange',
            icon: '●',
            label: '연결 중...'
          };
        case BACKEND_STATUS.ERROR:
          return {
            color: 'red',
            icon: '✕',
            label: '오류'
          };
        default:
          return {
            color: 'gray',
            icon: '○',
            label: '확인 중...'
          };
      }
    };

    const statusStyles = getStatusStyles();
    
    // 동기화 대기 중인 대화 수를 표시
    const pendingSyncCount = pendingSync.length;
    
    return (
      <div className="backend-status-indicator" 
           style={{ 
             position: 'absolute', 
             bottom: '8px', 
             right: '10px',
             fontSize: '12px',
             display: 'flex',
             alignItems: 'center',
             gap: '6px',
             background: 'rgba(0,0,0,0.05)',
             padding: '4px 8px',
             borderRadius: '4px',
             cursor: 'pointer',
             zIndex: 100
           }}
           title={`백엔드 상태: ${statusStyles.label}\n${
             backendStatus === BACKEND_STATUS.CONNECTED 
               ? `서비스: Redis(${backendServices.redis ? '✓' : '✗'}), ES(${backendServices.elasticsearch ? '✓' : '✗'})`
               : '백엔드 서버에 연결할 수 없습니다.'
           }${pendingSyncCount > 0 ? `\n동기화 대기 중: ${pendingSyncCount}개` : ''}`}
           onClick={() => {
             // 클릭 시 즉시 상태 확인 및 동기화 시도
             checkAndUpdateBackendStatus();
           }}
      >
        <span style={{ color: statusStyles.color, fontWeight: 'bold' }}>
          {statusStyles.icon}
        </span>
        <span>{statusStyles.label}</span>
        {pendingSyncCount > 0 && (
          <span style={{ 
            background: 'orange', 
            color: 'white', 
            borderRadius: '50%', 
            width: '16px', 
            height: '16px',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            {pendingSyncCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-gray-100 overflow-hidden relative">
      {/* 임베딩 처리 오버레이 */}
      <EmbeddingOverlay 
        isActive={isEmbedding} 
        status={embeddingStatus} 
        files={embeddedFiles}
      />
      
      {/* 사이드바 */}
      <div
        className={`absolute md:relative inset-y-0 left-0 z-20 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0 w-${sidebarWidth}px flex flex-col border-r border-gray-800 h-full bg-gray-900`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onTogglePinConversation={handleTogglePinConversation}
          onToggleTheme={toggleTheme}
          isDarkMode={theme === "dark"}
          onToggleMode={setMode}
          currentMode={mode}
          onDeleteAllConversations={deleteAllConversations}
          recentQueries={recentQueries || []}
          dbSchema={dbSchema || {}}
          dashboardStats={dashboardStats || {}}
          isResponding={isResponding}
        />
        <div
          className="absolute top-0 -right-3 h-full w-3 cursor-ew-resize z-10"
          onMouseDown={handleMouseDown}
        ></div>
      </div>

      {/* 채팅 컨테이너, SQL 쿼리 페이지 또는 대시보드 */}
      <div className="flex-grow relative overflow-hidden">
        {mode === 'sql' ? (
          // SQL 쿼리 페이지 렌더링
          <div className="w-full h-full">
            <SQLQueryPage 
              setMode={setMode} 
              key="sql-page-component" 
            />
          </div>
        ) : mode === 'dashboard' ? (
          // 대시보드 렌더링
          <div className="w-full h-full">
            <Dashboard 
              setMode={setMode} 
              key="dashboard-component" 
            />
          </div>
        ) : (
          // 챗봇 컨테이너 렌더링
          <div className="w-full h-full">
            {!sidebarOpen && (
              <button
                className="absolute left-4 top-4 z-10 md:hidden p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                onClick={handleToggleSidebar}
              >
                <FiMenu size={20} />
              </button>
            )}
            <ChatContainer
              scrollLocked={scrollLocked}
              activeConversationId={activeConversationId}
              messages={currentMessages}
              searchTerm={searchTerm}
              filteredMessages={filteredMessages}
              onUpdateMessages={handleUpdateMessages}
              isEmbedding={isEmbedding}
              onUploadSuccess={handleUploadSuccess}
              onNewConversation={handleNewConversation}
              fileManagerOpen={fileManagerOpen}
              setFileManagerOpen={setFileManagerOpen}
              sidebarOpen={sidebarOpen}
              setMode={setMode}
              currentMode={mode}
              isStreaming={isStreaming}
              setIsStreaming={setIsStreaming}
              onStopGeneration={handleStopGeneration}
              isResponding={isResponding}
              key="chat-container-component"
            />
          </div>
        )}
      </div>
      <BackendStatusIndicator />
      <ResponseBlockedMessage />
    </div>
  );
}

export default App;
