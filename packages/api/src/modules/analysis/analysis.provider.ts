export interface AnalysisProviderRequest {
  document_id: string;
  document_type: string;
  file_name: string;
}

export interface AnalysisProviderResponse {
  raw_json: string;
  model_name: string;
}

export interface AnalysisProvider {
  readonly name: string;
  analyze(request: AnalysisProviderRequest): Promise<AnalysisProviderResponse>;
}
