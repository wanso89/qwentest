import redis
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class RedisSessionManager:
    """Redis를 사용한 세션 및 대화 관리 서비스"""
    
    def __init__(self, redis_url="redis://localhost:6379/0"):
        """Redis 세션 관리자 초기화
        
        Args:
            redis_url: Redis 서버 URL (기본값: "redis://localhost:6379/0")
        """
        try:
            self.redis = redis.Redis.from_url(redis_url, decode_responses=True)
            self.session_ttl = 60 * 60 * 24 * 30  # 30일 유지
            # 연결 테스트
            self.redis.ping()
            logger.info(f"Redis 서버 연결 성공: {redis_url}")
        except redis.ConnectionError as e:
            logger.error(f"Redis 서버 연결 실패: {e}")
            # Fallback 모드로 작동할 수 있도록 예외는 잡되 로깅만 함
    
    def is_connected(self) -> bool:
        """Redis 서버 연결 상태 확인
        
        Returns:
            bool: 연결 상태 (True: 연결됨, False: 연결 안됨)
        """
        try:
            return self.redis.ping()
        except:
            return False
    
    def save_conversation(self, user_id: str, conversation_id: str, messages: List[Dict[str, Any]]) -> bool:
        """대화 내용을 Redis에 저장
        
        Args:
            user_id: 사용자 ID
            conversation_id: 대화 ID
            messages: 대화 메시지 목록
            
        Returns:
            bool: 저장 성공 여부
        """
        try:
            if not self.is_connected():
                logger.warning("Redis 연결 없음: 대화 저장 실패")
                return False
                
            key = f"conversation:{user_id}:{conversation_id}"
            data = {
                "userId": user_id,
                "conversationId": conversation_id,
                "messages": messages,
                "timestamp": datetime.now().isoformat()
            }
            
            # 저장 전 로깅
            logger.info(f"Redis 대화 저장 시작 - 키: {key}, 메시지 수: {len(messages)}")
            
            # 직접 문자열로 변환하여 저장 (dump 에러 방지)
            json_data = json.dumps(data, ensure_ascii=False)
            
            # 대화 저장 - 기존 setex 대신 set 명령어 사용 후 만료 시간 별도 설정
            success = self.redis.set(key, json_data)
            if success:
                # 만료 시간 설정
                self.redis.expire(key, self.session_ttl)
                
                # 저장 확인
                check = self.redis.exists(key)
                logger.info(f"Redis 키 존재 확인: {key} = {check}")
            
            # 사용자별 대화 목록 업데이트
            user_convs_key = f"user_conversations:{user_id}"
            self.redis.sadd(user_convs_key, conversation_id)
            self.redis.expire(user_convs_key, self.session_ttl)
            
            # 저장 후 키 목록 로깅 (디버깅용)
            keys = self.redis.keys(f"conversation:{user_id}:*")
            logger.info(f"현재 Redis 대화 키 목록 ({user_id}): {keys}")
            
            return bool(success)
        except Exception as e:
            logger.error(f"대화 저장 중 오류 발생: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def load_conversation(self, user_id: str, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Redis에서 대화 내용 불러오기
        
        Args:
            user_id: 사용자 ID
            conversation_id: 대화 ID
            
        Returns:
            Optional[Dict[str, Any]]: 대화 데이터 (없으면 None)
        """
        try:
            if not self.is_connected():
                logger.warning("Redis 연결 없음: 대화 불러오기 실패")
                return None
                
            key = f"conversation:{user_id}:{conversation_id}"
            logger.info(f"Redis에서 대화 불러오기 시도: {key}")
            
            # 키 존재 여부 먼저 확인
            if not self.redis.exists(key):
                logger.warning(f"Redis에 해당 키가 존재하지 않음: {key}")
                
                # 유사한 키가 있는지 패턴 검색 (디버깅용)
                similar_keys = self.redis.keys(f"conversation:{user_id}:*")
                if similar_keys:
                    logger.info(f"유사한 키 목록 발견: {similar_keys}")
                return None
            
            # 데이터 가져오기
            data = self.redis.get(key)
            
            if not data:
                logger.warning(f"Redis에서 키는 존재하지만 데이터가 없음: {key}")
                return None
                
            # TTL 갱신 (사용할 때마다 만료 시간 연장)
            self.redis.expire(key, self.session_ttl)
            
            # JSON 파싱
            try:
                parsed_data = json.loads(data)
                logger.info(f"Redis에서 대화 불러오기 성공: {key}")
                return parsed_data
            except json.JSONDecodeError as e:
                logger.error(f"Redis 데이터 JSON 파싱 오류: {e}")
                # 원본 데이터 로깅 (최대 100자)
                logger.error(f"원본 데이터: {data[:100]}...")
                return None
        except Exception as e:
            logger.error(f"대화 불러오기 중 오류 발생: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    def list_user_conversations(self, user_id: str) -> List[str]:
        """사용자의 모든 대화 ID 목록 반환
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            List[str]: 대화 ID 목록
        """
        try:
            if not self.is_connected():
                logger.warning("Redis 연결 없음: 사용자 대화 목록 조회 실패")
                return []
                
            # 방법 1: 세트에서 조회 (정석)
            user_convs_key = f"user_conversations:{user_id}"
            conversation_ids = list(self.redis.smembers(user_convs_key))
            
            # 방법 2: 패턴 검색으로 모든 키 찾기 (백업)
            if not conversation_ids:
                logger.info(f"세트에서 대화 ID를 찾지 못함. 패턴 검색 시도: {user_id}")
                pattern = f"conversation:{user_id}:*"
                keys = self.redis.keys(pattern)
                
                # 키에서 대화 ID 추출 (conversation:user_id:conv_id 형식)
                for key in keys:
                    parts = key.split(":")
                    if len(parts) >= 3:
                        conv_id = parts[2]  # 세 번째 부분이 대화 ID
                        conversation_ids.append(conv_id)
                        # 세트에도 추가 (향후 조회 용이)
                        self.redis.sadd(user_convs_key, conv_id)
                
                # 결과가 있으면 세트 만료 시간 설정
                if conversation_ids:
                    self.redis.expire(user_convs_key, self.session_ttl)
                    logger.info(f"패턴 검색으로 대화 ID {len(conversation_ids)}개 찾음")
            
            # 조회 결과 로깅
            if conversation_ids:
                logger.info(f"사용자 {user_id}의 대화 목록 조회 성공: {len(conversation_ids)}개")
            else:
                logger.warning(f"사용자 {user_id}의 대화가 없음")
                
            return conversation_ids
        except Exception as e:
            logger.error(f"사용자 대화 목록 조회 중 오류 발생: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        """대화 삭제
        
        Args:
            user_id: 사용자 ID
            conversation_id: 대화 ID
            
        Returns:
            bool: 삭제 성공 여부
        """
        try:
            if not self.is_connected():
                logger.warning("Redis 연결 없음: 대화 삭제 실패")
                return False
                
            key = f"conversation:{user_id}:{conversation_id}"
            deleted = self.redis.delete(key)
            
            # 사용자별 대화 목록에서도 제거
            user_convs_key = f"user_conversations:{user_id}"
            self.redis.srem(user_convs_key, conversation_id)
            
            return deleted > 0
        except Exception as e:
            logger.error(f"대화 삭제 중 오류 발생: {e}")
            return False

    def clear_all_conversations(self, user_id: str) -> bool:
        """사용자의 모든 대화 삭제
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            bool: 삭제 성공 여부
        """
        try:
            if not self.is_connected():
                logger.warning("Redis 연결 없음: 모든 대화 삭제 실패")
                return False
                
            # 사용자의 모든 대화 ID 조회
            conversation_ids = self.list_user_conversations(user_id)
            
            # 각 대화 삭제
            for conv_id in conversation_ids:
                key = f"conversation:{user_id}:{conv_id}"
                self.redis.delete(key)
            
            # 사용자 대화 목록 키 삭제
            user_convs_key = f"user_conversations:{user_id}"
            self.redis.delete(user_convs_key)
            
            return True
        except Exception as e:
            logger.error(f"모든 대화 삭제 중 오류 발생: {e}")
            return False

# 싱글톤 인스턴스
_redis_session_manager = None

def get_redis_session_manager(redis_url="redis://localhost:6379/0") -> RedisSessionManager:
    """RedisSessionManager의 싱글톤 인스턴스 반환
    
    Args:
        redis_url: Redis 서버 URL
        
    Returns:
        RedisSessionManager: 싱글톤 인스턴스
    """
    global _redis_session_manager
    if _redis_session_manager is None:
        _redis_session_manager = RedisSessionManager(redis_url)
    return _redis_session_manager 