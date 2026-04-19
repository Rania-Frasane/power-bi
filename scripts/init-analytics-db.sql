-- Analytics Database Schema for Power BI Dashboard
-- This migration creates tables for datasets, analyses, and visualizations

-- Create datasets table
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255),
  source_type VARCHAR(50) NOT NULL, -- 'csv', 'excel', 'json'
  file_path TEXT,
  file_size INTEGER,
  row_count INTEGER,
  column_count INTEGER,
  columns JSONB, -- Store column metadata: [{name, type, description}]
  summary TEXT, -- AI-generated summary of the dataset
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  analysis_type VARCHAR(100) NOT NULL, -- 'statistical', 'trend', 'correlation', 'outlier_detection', 'segmentation'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  insights JSONB, -- Structured insights: [{type, description, data}]
  recommendations JSONB, -- AI-generated recommendations
  key_metrics JSONB, -- Important metrics: {metric_name: value}
  raw_analysis TEXT, -- Full AI analysis response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create charts table
CREATE TABLE IF NOT EXISTS charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  chart_type VARCHAR(50) NOT NULL, -- 'line', 'bar', 'pie', 'scatter', 'area', 'table'
  title VARCHAR(255),
  description TEXT,
  x_axis VARCHAR(100),
  y_axis VARCHAR(100),
  groupBy VARCHAR(100),
  data JSONB, -- Processed chart data: {labels, datasets}
  config JSONB, -- Chart.js or Recharts config options
  insights TEXT, -- AI-generated insights about the chart
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout JSONB, -- Dashboard layout configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dashboard_charts table (junction table)
CREATE TABLE IF NOT EXISTS dashboard_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_insights table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  insight_type VARCHAR(100) NOT NULL, -- 'trend', 'anomaly', 'pattern', 'recommendation'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  confidence FLOAT, -- 0-1 confidence score
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create data_summaries table (cache for quick access)
CREATE TABLE IF NOT EXISTS data_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  summary_type VARCHAR(100) NOT NULL, -- 'basic_stats', 'distribution', 'correlation'
  summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dataset_id, summary_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON datasets(created_at);
CREATE INDEX IF NOT EXISTS idx_analyses_dataset_id ON analyses(dataset_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_charts_dataset_id ON charts(dataset_id);
CREATE INDEX IF NOT EXISTS idx_charts_analysis_id ON charts(analysis_id);
CREATE INDEX IF NOT EXISTS idx_charts_user_id ON charts(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_charts_dashboard_id ON dashboard_charts(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_charts_chart_id ON dashboard_charts(chart_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_dataset_id ON ai_insights(dataset_id);
CREATE INDEX IF NOT EXISTS idx_data_summaries_dataset_id ON data_summaries(dataset_id);

-- Enable Row Level Security (RLS) for security
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
-- Datasets RLS
CREATE POLICY "Users can view their own datasets" ON datasets
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert datasets" ON datasets
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own datasets" ON datasets
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own datasets" ON datasets
  FOR DELETE USING (auth.uid()::text = user_id);

-- Analyses RLS
CREATE POLICY "Users can view their own analyses" ON analyses
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert analyses" ON analyses
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own analyses" ON analyses
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Charts RLS
CREATE POLICY "Users can view their own charts" ON charts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert charts" ON charts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own charts" ON charts
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Dashboards RLS
CREATE POLICY "Users can view their own dashboards" ON dashboards
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert dashboards" ON dashboards
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own dashboards" ON dashboards
  FOR UPDATE USING (auth.uid()::text = user_id);

-- AI Insights RLS
CREATE POLICY "Users can view their own insights" ON ai_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM datasets WHERE id = ai_insights.dataset_id AND user_id = auth.uid()::text
    )
  );

-- Data Summaries RLS
CREATE POLICY "Users can view their own summaries" ON data_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM datasets WHERE id = data_summaries.dataset_id AND user_id = auth.uid()::text
    )
  );
