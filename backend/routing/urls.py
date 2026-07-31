from django.urls import path
from .views import OptimizeRouteView, PipelineAgentView, DispatchChatAgentView

urlpatterns = [
    path('optimize/', OptimizeRouteView.as_view(), name='optimize-routes'),
    path('agent/pipeline/', PipelineAgentView.as_view(), name='agent-pipeline'),
    path('agent/chat/', DispatchChatAgentView.as_view(), name='agent-chat'),
]
