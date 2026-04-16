"""
File processing service for handling CSV, Excel, and JSON uploads.
Handles parsing, validation, and schema detection.
"""

import pandas as pd
import json
import os
from typing import Dict, List, Any, Tuple
from io import StringIO, BytesIO


class FileProcessor:
    """Process and validate uploaded files"""
    
    SUPPORTED_FORMATS = ['csv', 'xlsx', 'xls', 'json']
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    
    @staticmethod
    def process_file(file_obj, file_type: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Process uploaded file and return DataFrame and metadata.
        
        Args:
            file_obj: Django UploadedFile object
            file_type: Type of file ('csv', 'excel', 'json')
        
        Returns:
            Tuple of (DataFrame, metadata dict)
        """
        try:
            # Validate file
            FileProcessor._validate_file(file_obj)
            
            # Read file based on type
            if file_type.lower() in ['csv']:
                df = pd.read_csv(file_obj)
            elif file_type.lower() in ['xlsx', 'xls', 'excel']:
                df = pd.read_excel(file_obj)
            elif file_type.lower() == 'json':
                df = pd.read_json(file_obj)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
            
            # Clean and validate
            df = FileProcessor._clean_dataframe(df)
            metadata = FileProcessor._extract_metadata(df)
            
            return df, metadata
            
        except Exception as e:
            raise Exception(f"Error processing file: {str(e)}")
    
    @staticmethod
    def _validate_file(file_obj):
        """Validate file size and type"""
        if file_obj.size > FileProcessor.MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds {FileProcessor.MAX_FILE_SIZE / 1024 / 1024}MB limit")
    
    @staticmethod
    def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
        """Clean and normalize DataFrame"""
        # Remove completely empty rows and columns
        df = df.dropna(how='all')
        df = df.loc[:, (df != '').all(axis=0)]
        
        # Convert column names to strings and remove whitespace
        df.columns = [str(col).strip() for col in df.columns]
        
        # Remove duplicate column names by adding index
        if len(df.columns) != len(set(df.columns)):
            seen = {}
            new_cols = []
            for col in df.columns:
                if col in seen:
                    seen[col] += 1
                    new_cols.append(f"{col}_{seen[col]}")
                else:
                    seen[col] = 0
                    new_cols.append(col)
            df.columns = new_cols
        
        return df
    
    @staticmethod
    def _extract_metadata(df: pd.DataFrame) -> Dict[str, Any]:
        """Extract schema and statistics from DataFrame"""
        schema = {}
        statistics = {}
        
        for col in df.columns:
            dtype = str(df[col].dtype)
            
            # Determine column type
            if pd.api.types.is_numeric_dtype(df[col]):
                col_type = 'numeric'
                stats = {
                    'min': float(df[col].min()) if not pd.isna(df[col].min()) else None,
                    'max': float(df[col].max()) if not pd.isna(df[col].max()) else None,
                    'mean': float(df[col].mean()) if not pd.isna(df[col].mean()) else None,
                    'median': float(df[col].median()) if not pd.isna(df[col].median()) else None,
                }
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                col_type = 'date'
                stats = {
                    'min': str(df[col].min()),
                    'max': str(df[col].max()),
                }
            else:
                col_type = 'categorical'
                stats = {
                    'unique_count': int(df[col].nunique()),
                    'top_values': df[col].value_counts().head(5).to_dict(),
                }
            
            null_count = int(df[col].isna().sum())
            
            schema[col] = {
                'type': col_type,
                'dtype': dtype,
                'null_count': null_count,
                'null_percentage': float(null_count / len(df) * 100),
            }
            
            statistics[col] = stats
        
        return {
            'schema': schema,
            'row_count': len(df),
            'column_count': len(df.columns),
            'statistics': statistics,
            'memory_usage_mb': float(df.memory_usage(deep=True).sum() / 1024 / 1024),
        }
    
    @staticmethod
    def get_sample_data(df: pd.DataFrame, rows: int = 100) -> List[Dict]:
        """Get sample rows from DataFrame"""
        sample_df = df.head(rows)
        # Convert to list of dicts, handling NaN values
        return sample_df.where(pd.notna(sample_df), None).to_dict('records')
    
    @staticmethod
    def get_data_preview(df: pd.DataFrame) -> Dict[str, Any]:
        """Get preview information about the dataset"""
        return {
            'row_count': len(df),
            'column_count': len(df.columns),
            'columns': list(df.columns),
            'dtypes': {col: str(dtype) for col, dtype in zip(df.columns, df.dtypes)},
            'sample_data': FileProcessor.get_sample_data(df, 10),
        }
    
    @staticmethod
    def detect_column_type(series: pd.Series) -> str:
        """Detect the logical type of a column"""
        if pd.api.types.is_numeric_dtype(series):
            return 'numeric'
        elif pd.api.types.is_datetime64_any_dtype(series):
            return 'date'
        elif pd.api.types.is_bool_dtype(series):
            return 'boolean'
        else:
            # Check if it looks like a date
            try:
                pd.to_datetime(series, errors='coerce')
                if series.notna().sum() > len(series) * 0.5:
                    return 'date'
            except:
                pass
            
            # Check if it looks like a number
            try:
                pd.to_numeric(series, errors='coerce')
                if series.notna().sum() > len(series) * 0.5:
                    return 'numeric'
            except:
                pass
            
            return 'categorical'
    
    @staticmethod
    def filter_data(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
        """Apply filters to DataFrame"""
        filtered_df = df.copy()
        
        for column, filter_config in filters.items():
            if column not in filtered_df.columns:
                continue
            
            filter_type = filter_config.get('type', 'equals')
            value = filter_config.get('value')
            
            if filter_type == 'equals':
                filtered_df = filtered_df[filtered_df[column] == value]
            elif filter_type == 'contains':
                filtered_df = filtered_df[filtered_df[column].astype(str).str.contains(str(value), case=False)]
            elif filter_type == 'greater_than':
                filtered_df = filtered_df[filtered_df[column] > value]
            elif filter_type == 'less_than':
                filtered_df = filtered_df[filtered_df[column] < value]
            elif filter_type == 'between':
                min_val, max_val = value
                filtered_df = filtered_df[(filtered_df[column] >= min_val) & (filtered_df[column] <= max_val)]
            elif filter_type == 'in_list':
                filtered_df = filtered_df[filtered_df[column].isin(value)]
        
        return filtered_df
    
    @staticmethod
    def aggregate_data(df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Aggregate data based on configuration"""
        group_by = config.get('group_by', [])
        aggregations = config.get('aggregations', {})
        
        if not group_by:
            return df
        
        agg_dict = {}
        for col, agg_func in aggregations.items():
            if col in df.columns:
                agg_dict[col] = agg_func
        
        if agg_dict:
            return df.groupby(group_by).agg(agg_dict).reset_index()
        else:
            return df.groupby(group_by).size().reset_index(name='count')
