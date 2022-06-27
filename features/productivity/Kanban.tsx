import {FC} from "react";
import {DragDropContext, Droppable} from "react-beautiful-dnd";

const Kanban: FC<{cols: object}> = ({cols}) => (
  <div className="flex justify-center h-full">
    <DragDropContext onDragEnd={(result) => console.log(result)}>
      {Object.entries(cols).map(([id, col]) => (
        <Droppable key={id} droppableId={id}>
          {(provided, snapshot) => (
            <div className="p-4 w-48 min-h-500" {...provided.droppableProps} ref={provided.innerRef}></div>
          )}
        </Droppable>
      ))}
    </DragDropContext>
  </div>
);

export default Kanban;
