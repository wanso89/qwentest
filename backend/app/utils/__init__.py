"""
RAG 챗봇 유틸리티 모듈
"""

# 유틸리티 모듈 임포트
from app.utils.indexing_utils import (
    process_and_index_file,
    ES_INDEX_NAME,
    check_file_exists,
    format_file_size
)

# 검색 개선 관련 유틸리티 임포트
try:
    from app.utils.search_enhancer import (
        QueryExpander,
        SearchScoreEnhancer,
        ContextualReranker,
        EnhancedSearchPipeline
    )
except ImportError:
    pass

# 피드백 분석 관련 유틸리티 임포트
try:
    from app.utils.feedback_analyzer import (
        FeedbackAnalyzer,
        SearchQualityOptimizer
    )
except ImportError:
    pass

# Vanna AI 관련 유틸리티 임포트
try:
    from app.utils.vanna_interface import (
        VannaInterface,
        get_vanna_interface
    )
    from app.utils.get_mariadb_schema import (
        get_mariadb_schema,
        get_schema_for_vanna,
        test_db_connection
    )
    from app.utils.vanna_local import (
        VannaLocal,
        get_vanna_local
    )
except ImportError:
    pass

# 순환 참조 문제를 방지하기 위해 실제 임포트는 함수 내에서 수행

def _safe_import():
    """안전하게 모듈을 임포트하는 함수"""
    # 이미 임포트된 모듈들은 다시 임포트하지 않음
    global _imported
    if '_imported' in globals() and _imported:
        return

    try:
        # OCR 유틸리티
        from .ocr_utils import (
            extract_text_from_file,
            extract_text_from_image,
            extract_text_from_pdf_with_ocr
        )
        globals().update(locals())  # 전역 네임스페이스에 추가
        
        # indexing 유틸리티
        from .indexing_utils import (
            process_and_index_file, 
            ES_INDEX_NAME, 
            check_file_exists, 
            format_file_size,
            load_document,
            split_text
        )
        globals().update(locals())  # 전역 네임스페이스에 추가
        
        # 검색 개선 모듈
        from .search_enhancer import (
            EnhancedSearchPipeline,
            # handle_es_search  # 주석 처리
        )  
        globals().update(locals())  # 전역 네임스페이스에 추가
        
        # 피드백 분석기
        from .feedback_analyzer import (
            FeedbackAnalyzer,
            SearchQualityOptimizer,
            # analyze_search_quality # 주석 처리
        )
        globals().update(locals())  # 전역 네임스페이스에 추가
        
        # Vanna 인터페이스
        from .vanna_interface import (
            get_vanna_interface,
            # generate_sql_with_vanna # 주석 처리
        )
        globals().update(locals())  # 전역 네임스페이스에 추가
        
        # MariaDB 스키마
        from .get_mariadb_schema import (
            get_mariadb_schema,
            test_db_connection
        )
        globals().update(locals())  # 전역 네임스페이스에 추가
        
        # Vanna 로컬
        from .vanna_local import (
            get_vanna_local,
            # init_vanna_local # 주석 처리
        )
        globals().update(locals())  # 전역 네임스페이스에 추가
        
        _imported = True
        
    except ImportError as e:
        print(f"모듈 임포트 오류: {e}")
        _imported = False

# 첫 번째 임포트 시도
_safe_import()

# 명시적인 __all__ 정의
__all__ = [
    # OCR 유틸리티
    'extract_text_from_file',
    'extract_text_from_image',
    'extract_text_from_pdf_with_ocr',
    
    # 인덱싱 유틸리티
    'process_and_index_file',
    'ES_INDEX_NAME',
    'check_file_exists',
    'format_file_size',
    'load_document',
    'split_text',
    
    # 검색 개선 모듈
    'EnhancedSearchPipeline',
    # 'handle_es_search', # 주석 처리
    
    # 피드백 분석기
    'FeedbackAnalyzer',
    'SearchQualityOptimizer',
    # 'analyze_search_quality', # 주석 처리
    
    # Vanna 인터페이스
    'get_vanna_interface',
    # 'generate_sql_with_vanna', # 주석 처리
    
    # MariaDB 스키마
    'get_mariadb_schema',
    'test_db_connection',
    
    # Vanna 로컬
    'get_vanna_local',
    # 'init_vanna_local' # 주석 처리
]
