import { Module } from '@nestjs/common';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './services/projects.service';
import { TasksController, ProjectTasksController } from './controllers/tasks.controller';
import { TasksService } from './services/tasks.service';

@Module({
  controllers: [ProjectsController, TasksController, ProjectTasksController],
  providers: [ProjectsService, TasksService],
  exports: [],
})
export class ProjectsModule {}
